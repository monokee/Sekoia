import { STORE_BINDING_ID } from './store.js';
import { NOOP, forbiddenProxySet, deepEqual, deepClone, reconcile } from './utils.js';
import { ComputedProperty, setupComputedProperties, buildDependencyGraph } from "./computed.js";
import { Reactor } from "./reactor.js";

// --------------- COMPONENT GLOBALS -------------

// Regex matches when $self is:
// - immediately followed by css child selector (space . : # [ > + ~) OR
// - immediately followed by opening bracket { OR
// - immediately followed by chaining comma ,
// - not followed by anything (end of line)
const SELF_REGEXP = /(\$self(?=[\\040,{.:#[>+~]))|\$self\b/g;
const CHILD_SELECTORS = [' ','.',':','#','[','>','+','~'];

let UID = -1;

const DEFINED_COMPONENTS = new Set();
const COMP_DATA_CACHE = new Map();
const COMP_INIT_CACHE = new Map();
const COMP_METHOD_CACHE = new Map();
const SLOT_MARKUP_CACHE = new Map();

const INTERNAL = Symbol('Component Data');

const TMP_DIV = document.createElement('div');

const CUE_CSS = {
  compiler: document.getElementById('cue::compiler') || Object.assign(document.head.appendChild(document.createElement('style')), {id: 'cue::compiler'}),
  components: document.getElementById('cue::components') || Object.assign(document.head.appendChild(document.createElement('style')), {id: 'cue::components'})
};

// --------------- HTML UTILITIES -------------

const queryInElementBoundary = (root, selector, collection = []) => {

  for (let i = 0, child; i < root.children.length; i++) {

    child = root.children[i];

    if (child.hasAttribute(selector)) {
      collection.push(child);
    }

    if (!DEFINED_COMPONENTS.has(child.tagName)) {
      queryInElementBoundary(child, selector, collection);
    }

  }

  return collection;

};

const collectElementReferences = (root, refNames) => {

  for (let i = 0, child, ref, cls1, cls2; i < root.children.length; i++) {

    child = root.children[i];

    ref = child.getAttribute('$');

    if (ref) {
      cls1 = child.getAttribute('class');
      cls2 = ref + ++UID;
      refNames['$' + ref] = '.' + cls2;
      child.setAttribute('class', cls1 ? cls1 + ' ' + cls2 : cls2);
      child.removeAttribute('$');
    }

    if (!DEFINED_COMPONENTS.has(child.tagName)) {
      collectElementReferences(child, refNames);
    }

  }

  return refNames;

};

const createComponentMarkup = (openTag, innerHTML, closeTag, attributes) => {

  let htmlString = openTag;
  let instanceMethods = null;

  for (const att in attributes) {

    const val = attributes[att];

    if (typeof val === 'string') {

      htmlString += ' ' + att + '="' + val + '"';

    } else {

      ++UID;
      const uid = '' + UID;

      if (att === 'data') {
        COMP_DATA_CACHE.set(uid, val);
        htmlString += ' cue-data="' + uid + '"';
      } else if (att === 'slots') {
        SLOT_MARKUP_CACHE.set(uid, val);
        htmlString += ' cue-slot="' + uid + '"';
      } else if (att === 'initialize') {
        COMP_INIT_CACHE.set(uid, val);
        htmlString += ' cue-init="' + uid + '"';
      } else if (typeof val === 'function') {
        instanceMethods || (instanceMethods = {});
        instanceMethods[att] = val;
      }

    }

  }

  if (instanceMethods) {
    ++UID;
    const uid = '' + UID;
    COMP_METHOD_CACHE.set(uid, instanceMethods);
    htmlString += ' cue-func="' + uid + '"';
  }

  htmlString += '>' + innerHTML + closeTag;

  return htmlString;

};

// --------------- CUSTOM ELEMENT BASE CLASSES -------------

class CueModule {

  constructor(name, config) {

    this.name = name;
    this.ready = false;

    // --------------- PREPARE ELEMENT TEMPLATE --------------
    // this has to be done early so that ref-ready template.innerHTML
    // can be composed via string factory returned from Component.define
    this.template = document.createElement('template');
    this.template.innerHTML = config.element || '';
    this.refNames = collectElementReferences(this.template.content, {});

  }

  setupOnce(config) {

    if (this.ready === false) {

      this.ready = true;

      // ------------------ COMPLETE TEMPLATE -----------------
      this.template.__slots = {};
      this.template.__hasSlots = false;

      const slots = this.template.content.querySelectorAll('slot');
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        this.template.__slots[slot.getAttribute('name')] = slot.outerHTML;
        this.template.__hasSlots = true;
      }

      // ------------------ CREATE SCOPED CSS ------------------
      config.style = config.style || config.styles; // allow both names
      if (config.style) {
        this.style = this.createScopedStyles(config.style);
        CUE_CSS.components.innerHTML += this.style;
      }

      // ----------------- SETUP DATA, COMPUTED & REACTIONS --------------

      this.data = {
        static: {},
        computed: new Map(),
        bindings: {},
        reactions: {}
      };

      // Assign Data from Config
      const allProperties = {};

      if (config.data) {

        for (const k in config.data) {

          const v = config.data[k];

          allProperties[k] = v.value;

          if (v.value && v.value.id === STORE_BINDING_ID) {
            this.data.bindings[k] = v.value;
          } else if (typeof v.value === 'function') {
            this.data.computed.set(k, new ComputedProperty(k, v.value));
          } else {
            this.data.static[k] = v.value;
          }

          if (typeof v.reaction === 'function') {
            this.data.reactions[k] = v.reaction;
          }

        }

      }

      // Setup Computed Properties if assigned
      if (this.data.computed.size) {
        this.data.computed = setupComputedProperties(allProperties, this.data.computed);
      }

      // ---------------------- LIFECYCLE METHODS ----------------------
      this.initialize = typeof config.initialize === 'function' ? config.initialize : NOOP;

    }

  }

  createScopedStyles(styles) {

    // Re-write $self to component-name
    styles = styles.replace(SELF_REGEXP, this.name);

    // Re-write $refName(s) in style text to class selector
    for (const refName in this.refNames) {
      // replace $refName with internal .class when $refName is:
      // - immediately followed by css child selector (space . : # [ > + ~) OR
      // - immediately followed by opening bracket { OR
      // - immediately followed by chaining comma ,
      // - not followed by anything (end of line)
      styles = styles.replace(new RegExp("(\\" + refName + "(?=[\\40{,.:#[>+~]))|\\" + refName + "\b", 'g'), this.refNames[refName]);
    }

    CUE_CSS.compiler.innerHTML = styles;
    const tmpSheet = CUE_CSS.compiler.sheet;

    let styleNodeInnerHTML = '', styleQueries = '';
    for (let i = 0, rule; i < tmpSheet.rules.length; i++) {

      rule = tmpSheet.rules[i];

      if (rule.type === 7 || rule.type === 8) { // do not scope @keyframes
        styleNodeInnerHTML += rule.cssText;
      } else if (rule.type === 1) { // style rule
        styleNodeInnerHTML += this.constructScopedStyleRule(rule);
      } else if (rule.type === 4 || rule.type === 12) { // @media/@supports query
        styleQueries += this.constructScopedStyleQuery(rule);
      } else {
        console.warn(`CSS Rule of type "${rule.type}" is not currently supported by Cue Components.`);
      }

    }

    // write queries to the end of the rules AFTER the other rules (issue #13)
    styleNodeInnerHTML += styleQueries;

    // Empty Compiler styleSheet
    CUE_CSS.compiler.innerHTML = '';

    return styleNodeInnerHTML;

  }

  constructScopedStyleQuery(query, cssText = '') {

    if (query.type === 4) {
      cssText += '@media ' + query.media.mediaText + ' {';
    } else {
      cssText += '@supports ' + query.conditionText + ' {';
    }

    let styleQueries = '';

    for (let i = 0, rule; i < query.cssRules.length; i++) {

      rule = query.cssRules[i];

      if (rule.type === 7 || rule.type === 8) { // @keyframes
        cssText += rule.cssText;
      } else if (rule.type === 1) {
        cssText += this.constructScopedStyleRule(rule, cssText);
      } else if (rule.type === 4 || rule.type === 12) { // nested query
        styleQueries += this.constructScopedStyleQuery(rule);
      } else {
        console.warn(`CSS Rule of type "${rule.type}" is not currently supported by Components.`);
      }

    }

    // write nested queries to the end of the surrounding query (see issue #13)
    cssText += styleQueries + ' }';

    return cssText;

  }

  constructScopedStyleRule(rule) {

    let cssText = '';

    if (rule.selectorText.indexOf(',') > -1) {

      const selectors = rule.selectorText.split(',');
      const scopedSelectors = [];

      for (let i = 0, selector; i < selectors.length; i++) {

        selector = selectors[i].trim();

        if (selector.lastIndexOf(':root', 0) === 0) { // escape context (dont scope) :root notation
          scopedSelectors.push(selector.replace(':root', ''));
        } else if (this.isTopLevelSelector(selector, this.name)) { // dont scope component-name
          scopedSelectors.push(selector);
        } else { // prefix with component-name to create soft scoping
          scopedSelectors.push(this.name + ' ' + selector);
        }

      }

      cssText += scopedSelectors.join(', ') + rule.cssText.substr(rule.selectorText.length);

    } else {

      if (rule.selectorText.lastIndexOf(':root', 0) === 0) { // escape context (dont scope) :root notation
        cssText += rule.cssText.replace(':root', ''); // remove first occurrence of :root
      } else if (this.isTopLevelSelector(rule.selectorText)) { // dont scope component-name
        cssText += rule.cssText;
      } else { // prefix with component-name to create soft scoping
        cssText += this.name + ' ' + rule.cssText;
      }

    }

    return cssText;

  }

  isTopLevelSelector(selectorText) {
    if (selectorText === this.name) {
      return true;
    } else if (selectorText.lastIndexOf(this.name, 0) === 0) { // starts with componentName
      return CHILD_SELECTORS.indexOf(selectorText.charAt(this.name.length)) > -1; // character following componentName is valid child selector
    } else { // nada
      return false;
    }
  }

}

class CueElement extends HTMLElement {

  constructor(module, config) {

    super();

    // Setup base module the first time this component is built
    module.setupOnce(config);

    // ---------------------- INSTANCE INTERNALS ----------------------

    const internal = this[INTERNAL] = {
      module: module,
      reactions: {},
      computedProperties: new Map(),
      subscriptions: [],
      refs: {},
      initialized: false,
      dataEvent: new CustomEvent('data', {
        bubbles: true,
        cancelable: true,
        detail: {
          key: '',
          value: void 0
        }
      })
    };

    // ---------------------- INSTANCE DATA SETUP ----------------------

    const computedProperties = internal.computedProperties;

    internal._data = deepClone(module.data.static);
    internal.data = new Proxy({}, {
      set: forbiddenProxySet,
      get(_, key) {
        if (module.data.bindings[key]) return module.data.bindings[key].get();
        if (computedProperties.has(key)) return computedProperties.get(key).value(internal.data);
        return internal._data[key];
      }
    });

    // Clone Computed Properties
    if (module.data.computed.size) {
      for (const tuple of module.data.computed.entries()) {
        const val = tuple[1];
        computedProperties.set(tuple[0], new ComputedProperty(val.ownPropertyName, val.computation, val.sourceProperties));
      }
    }

    // Build Dependency Graph
    internal.dependencyGraph = buildDependencyGraph(internal.computedProperties);

    // Bind reactions with first argument as "refs" object, second argument the current value and third argument the entire "data" object
    for (const key in module.data.reactions) {
      internal.reactions[key] = value => {
        module.data.reactions[key](internal.refs, value, internal.data);
      };
    }

  }

  connectedCallback() {

    // when this element is a slotted element, wait until it is composed
    if (this.hasAttribute('slot')) {
      return;
    }

    const internal = this[INTERNAL];
    const module = internal.module;

    // ------------- INSTANCE INIT ------------
    // (only run after initial construction, never on re-connect)
    if (internal.initialized === false) {

      internal.initialized = true;

      // ----------- INSERT DOM AND ASSIGN REFS ----------
      if (module.template.__hasSlots) {

        // find slotted children in this instance
        let slots = null;

        if (this.hasAttribute('cue-slot')) {

          const uid = this.getAttribute('cue-slot');
          slots = SLOT_MARKUP_CACHE.get(uid);

        } else if (this.innerHTML) {

          const slottedChildren = this.querySelectorAll('[slot]');

          for (let i = 0; i < slottedChildren.length; i++) {
            const slottedChild = slottedChildren[i];
            slots || (slots = {});
            slots[slottedChild.getAttribute('slot')] = slottedChild.outerHTML;
          }

        }

        // insert slotted children into template
        if (slots) {

          let templateHTML = module.template.innerHTML;
          let hasSlottedChildren = false;

          for (const slotName in slots) {
            if (module.template.__slots[slotName]) {
              hasSlottedChildren = true;
              templateHTML = templateHTML.replace(module.template.__slots[slotName], slots[slotName]);
            }
          }

          this.innerHTML = templateHTML;

          // collect refs from composed slots
          if (hasSlottedChildren) {
            collectElementReferences(this, module.refNames);
          }

        } else { // No slotted children found - render template only (keep empty slots in markup)

          this.innerHTML = module.template.innerHTML;

        }

      } else { // Template has no Slots - render template only

        this.innerHTML = module.template.innerHTML;

      }

      // ---------------- ASSIGN REF ELEMENTS
      for (const refName in module.refNames) {
        const el = this.querySelector(module.refNames[refName]);
        if (el) {
          if (!el[INTERNAL]) {
            el[INTERNAL] = {};
            el.renderEach = this.renderEach; // give every ref element fast list rendering method
          }
          internal.refs[refName] = el; // makes ref available as $refName in js
        }
      }

      internal.refs['$self'] = this; // this === $self for completeness

      // ----------------- Compose attribute data into internal data model
      if (this.hasAttribute('cue-data')) {
        const uid = this.getAttribute('cue-data');
        const providedData = COMP_DATA_CACHE.get(uid);
        const internalClone = deepClone(internal._data);
        const providedDataClone = deepClone(providedData);
        internal._data = providedData; // switch pointer
        Object.assign(internal._data, internalClone, providedDataClone)
      }

      // ---------------- Add Composed Methods to Prototype (if any)
      if (this.hasAttribute('cue-func')) {
        const uid = this.getAttribute('cue-func');
        const methods = COMP_METHOD_CACHE.get(uid);
        for (const method in  methods) {
          CueElement.prototype[method] = methods[method];
        }
      }

      // ---------------- Cue Reactions
      for (const key in internal.reactions) {
        Reactor.cueCallback(internal.reactions[key], internal.data[key]);
      }

      // ---------------- Trigger First Render
      Reactor.react();

      // ---------------- Initialize after First Render
      requestAnimationFrame(() => {

        module.initialize.call(this, internal.refs);

        // ---------------- Call Inherited Initialize Functions (if any)
        if (this.hasAttribute('cue-init')) {
          const uid = this.getAttribute('cue-init');
          const initialize = COMP_INIT_CACHE.get(uid);
          initialize.call(this, internal.refs);
        }

      });

    }

    // Add Store Subscriptions on every connect callback - unbind in disconnectedCallback
    for (const key in module.data.bindings) {

      // Computation Subscriptions
      internal.dependencyGraph.has(key) && internal.subscriptions.push(module.data.bindings[key].store.subscribe(
        module.data.bindings[key].key,
        () => Reactor.cueComputations(internal.dependencyGraph, internal.reactions, key, internal.data)
      ));

      // Reaction Subscriptions
      internal.reactions[key] && internal.subscriptions.push(module.data.bindings[key].store.subscribe(
        module.data.bindings[key].key,
        internal.reactions[key]
      ));

    }

  }

  disconnectedCallback() {

    const internal = this[INTERNAL];
    const subscriptions = internal.subscriptions;
    while (subscriptions.length) {
      subscriptions.pop().unsubscribe();
    }

  }

  getData(key) {

    if (!key) {
      // when no key is passed, retrieve object of all settable properties (all except computed)
      const internal = this[INTERNAL];
      const dataClone = {};
      let key;

      for (key in internal.module.data.bindings) {
        dataClone[key] = internal.module.data.bindings[key].get();
      }

      for (key in internal._data) {
        dataClone[key] = internal._data[key];
      }

      return dataClone;

    }

    return this[INTERNAL].data[key];

  }

  setData(key, value) {

    if (typeof key === 'object') {
      for (const prop in key) {
        this.setData(prop, key[prop]);
      }
    }

    const internal = this[INTERNAL];
    const module = internal.module;

    if (module.data.computed.has(key)) {
      throw new Error(`You can not set property "${key}" because it is a computed property.`);
    }

    if (module.data.bindings[key] && !deepEqual(module.data.bindings[key].get(false), value)) {

      internal.dataEvent.detail.key = key;
      internal.dataEvent.detail.value = deepClone(value);
      this.dispatchEvent(internal.dataEvent);

      module.data.bindings[key].set(value);

    } else if (!deepEqual(internal._data[key], value)) {

      internal._data[key] = value;

      internal.dataEvent.detail.key = key;
      internal.dataEvent.detail.value = deepClone(value);
      this.dispatchEvent(internal.dataEvent);

      if (internal.reactions[key]) {
        Reactor.cueCallback(internal.reactions[key], value);
      }

      if (internal.dependencyGraph.has(key)) {
        Reactor.cueComputations(internal.dependencyGraph, internal.reactions, key, internal.data);
      }

      Reactor.react();

    }

  }

  autoBind(attribute = 'data-bind') {

    const bindableElements = queryInElementBoundary(this, attribute);

    if (bindableElements.length) {
      this.addEventListener('input', e => {
        if (bindableElements.indexOf(e.target) > -1) {
          if (e.target.matches('input[type="checkbox"]')) {
            this.setData(e.target.getAttribute(attribute), e.target.checked ? 1 : 0);
          } else if (e.target.matches('select[multiple]')) {
            this.setData(e.target.getAttribute(attribute), Array.from(e.target.selectedOptions).map(el => el.value));
          } else {
            this.setData(e.target.getAttribute(attribute), e.target.value);
          }
        }
      });
    }

  }

  renderEach(dataArray, createElement, updateElement = NOOP) {

    // accept arrays, convert plain objects to arrays, convert null or undefined to array
    dataArray = Array.isArray(dataArray) ? dataArray : Object.values(dataArray || {});

    // this function is attached directly to dom elements. "this" refers to the element
    const previousData = this[INTERNAL].childData || [];
    this[INTERNAL].childData = dataArray;

    if (dataArray.length === 0) {
      this.innerHTML = '';
    } else if (previousData.length === 0) {
      for (let i = 0; i < dataArray.length; i++) {
        this.appendChild(createElement(dataArray[i], i, dataArray));
      }
    } else {
      reconcile(this, previousData, dataArray, createElement, updateElement);
    }

  }

}

// --------------- PUBLIC API -------------

export const Component = {

  define(name, config) {

    const Module = new CueModule(name, config);

    // ---------------------- SETUP COMPONENT ----------------------
    class CueComponent extends CueElement {
      constructor() {
        super(Module, config);
      }
    }

    // ---------------------- ADD METHODS TO PROTOTYPE ----------------------
    for (const k in config) {
      if (typeof config[k] === 'function' && k !== 'initialize') {
        CueComponent.prototype[k] = config[k];
      }
    }

    // ---------------------- DEFINE CUSTOM ELEMENT ----------------------
    DEFINED_COMPONENTS.add(name.toUpperCase());
    customElements.define(name, CueComponent);

    // ----------------------- RETURN HTML FACTORY FOR EMBEDDING ELEMENT WITH ATTRIBUTES -----------------------
    const openTag = '<'+name, closeTag = '</'+name+'>';

    return (attributes = {}) => createComponentMarkup(openTag, Module.template.innerHTML, closeTag, attributes);

  },

  extend(component, config) {
    return (attributes = {}) => component(Object.assign(config, attributes));
  },

  create(node) {

    node = typeof node === 'function' ? node() : node;
    node = node.trim();

    if (typeof node !== 'string' || node[0] !== '<') {
      throw new Error('[Cue.js] - Component.create(node) -> argument "node" is not valid HTML: "' + node + '"');
    }

    TMP_DIV.innerHTML = node;
    return TMP_DIV.children[0];

  }

};