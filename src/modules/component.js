import { Store } from './store.js';
import { NOOP, RESOLVED_PROMISE, ifFn, deepEqual, deepClone } from './utils.js';
import { ComputedProperty, setupComputedProperties, buildDependencyGraph } from "./computed.js";
import { Reactor } from "./reactor.js";

const REF_ID = 'ref';
const INTERNAL = Symbol('Component Data');
const CUE_STYLESHEET = (() => {
  const stylesheet = document.createElement('style');
  stylesheet.id = 'cue::components';
  document.head.appendChild(stylesheet);
  return stylesheet.sheet;
})();
const TMP_STYLESHEET = document.createElement('style');

export const Component = {

  define(name, config) {

    // ---------------------- LAZY MODULE CONFIG ----------------------
    let Module = null;

    // ---------------------- ATTRIBUTES (PRE-MODULE) ----------------------
    const observedAttributes = config.attributes ? Object.keys(config.attributes) : [];
    //const attributeChangedCallbacks = observedAttributes.map(name => config.attributes[name]);

    // ---------------------- CUSTOM ELEMENT INSTANCE ----------------------
    const component = class extends HTMLElement {

      constructor() {

        super();

        let key, tuple;

        // Lazy Module Init
        if (Module === null) {

          Module = createModule(name, config);

          // Add Methods to this class' prototype
          component.prototype.renderEach = renderEach;
          for (key in Module.methods) {
            component.prototype[key] = Module.methods[key];
          }

        }

        // Establish Computed Properties
        const _computedProperties = new Map();

        // Create Internal Data Structure
        const _data = deepClone(Module.data);

        const internal = this[INTERNAL] = {
          _data: _data,
          data: new Proxy(_data, {
            get(target, key) {
              if (Module.storeBindings[key]) return Store.get(Module.storeBindings[key].path);
              if (_computedProperties.has(key)) return _computedProperties.get(key).value(internal.data);
              const value = target[key];
              if (Array.isArray(value)) return value.slice();
              if (typeof value === 'object' && value !== null) return Object.assign({}, value);
              return value;
            }
          }),
          computedProperties: _computedProperties,
          reactions: {},
          attributeChangedCallbacks: {},
          subscriptions: [],
          refs: {},
          initialized: false
        };

        // Clone Computed Properties
        for (tuple of Module.computedProperties.entries()) {
          _computedProperties.set(tuple[0], new ComputedProperty(tuple[1].ownPropertyName, tuple[1].computation, tuple[1].sourceProperties));
        }

        // Build Dependency Graph
        internal.dependencyGraph = buildDependencyGraph(internal.computedProperties);

        // Bind reactions with first argument as "refs" object ("this" is explicitly null to discourage impurity)
        for (key in Module.reactions) {
          internal.reactions[key] = Module.reactions[key].bind(null, internal.refs);
        }

        // Same for Attribute Reactions
        for (key in Module.attributeChangedCallbacks) {
          internal.attributeChangedCallbacks[key] = Module.attributeChangedCallbacks[key].bind(null, internal.refs);
        }

        // Construct Lifecycle
        Module.construct.call(this, this); // only ref that is available is self...

      }

      connectedCallback() {

        const internal = this[INTERNAL];

        // ALWAYS add Store Subscriptions (unbind in disconnectedCallback)
        for (const key in Module.storeBindings) {

          internal.dependencyGraph.has(key) && internal.subscriptions.push(Store.subscribe(
            Module.storeBindings[key].path,
            () => Reactor.cueComputations(internal.dependencyGraph, internal.reactions, key, internal.data)
          ));

          internal.reactions[key] && internal.subscriptions.push(Store.subscribe(
            Module.storeBindings[key].path,
            value => Reactor.cueCallback(internal.reactions[key], value)
          ));

        }

        // INITIALIZER - RUN ONLY ONCE
        if (internal.initialized === false) {

          let i, path, key;

          // ------------- Create DOM
          if (Module.encapsulated === true) {

            const shadow = internal.shadowDom = this.attachShadow({mode: 'open'});

            shadow.innerHTML = Module.styles; // styles will be string

            // move inline child nodes into shadowDOM
            for (i = 0; i < this.childNodes.length; i++) {
              shadow.appendChild(this.childNodes[i]);
            }

            // write template to the beginning
            for (i = Module.template.children.length - 1; i >= 0; i--) {
              shadow.insertBefore(Module.template.children[i].cloneNode(true), this.firstChild);
            }

          } else {

            // Style has already been added to global CSS...
            // Clone template into light dom (if element has content, the content is automatically rendered AFTER the internal template nodes)
            for (i = Module.template.children.length - 1; i >= 0; i--) {
              this.insertBefore(Module.template.children[i].cloneNode(true), this.firstChild);
            }

          }

          // ---------------- Create Refs
          assignElementReferences(Module.encapsulated ? internal.shadowDom : this, internal.refs, Module.refNames);

          // ---------------- Consider Element Initialized
          internal.initialized = true;

          // ----------------- Bind / Cue Store
          let storeBinding;
          for (key in Module.storeBindings) {

            storeBinding = Module.storeBindings[key];
            path = storeBinding.path;

            if (Store.has(path)) {
              if (internal.reactions[key]) {
                Reactor.cueCallback(internal.reactions[key], Store.get(path));
              }
            } else {
              if (storeBinding.hasOwnProperty('defaultValue')) {
                Store.set(path, storeBinding.defaultValue);
              } else {
                throw new Error(`Component data of "${name}" has property "${key}" bound to Store["${path}"] but Store has no value and component specifies no default.`);
              }
            }

          }

          // ---------------- Run reactions
          for (key in internal.reactions) {
            Reactor.cueCallback(internal.reactions[key], internal.data[key]);
          }

          // ----------------- Run Attribute Changed Callbacks
          for (key in internal.attributeChangedCallbacks) {
            Reactor.cueCallback(internal.attributeChangedCallbacks[key], this.getAttribute(key));
          }

          // ---------------- Assign default attributes in case the element doesn't have them
          for (key in Module.defaultAttributeValues) {
            if (!this.hasAttribute(key)) {
              this.setAttribute(key, Module.defaultAttributeValues[key]);
            }
          }

          // ---------------- Trigger First Render
          Reactor.react().then(() => {
            Module.initialize.call(this, internal.refs);
            Module.connected.call(this, internal.refs);
          });

        } else {

          Module.connected.call(this, internal.refs); // runs whenever instance is (re-) inserted into DOM

        }

      }

      disconnectedCallback() {

        const subscriptions = this[INTERNAL].subscriptions;
        while (subscriptions.length) {
          subscriptions.pop().unsubscribe();
        }

        Module.disconnected.call(this, this[INTERNAL].refs);

      }

      adoptedCallback() {
        Module.adopted.call(this, this[INTERNAL].refs);
      }

      get(key) {
        return this[INTERNAL].data[key];
      }

      set(key, value) {

        // when we set and change a dependency of a computed property, set the computed to needsUpdate = true.

        if (arguments.length === 1 && typeof key === 'object' && key !== null) {

          const internal = this[INTERNAL];
          let didChange = false;

          for (const prop in key) {

            const oldValue = internal._data[prop];
            const newValue = key[prop];

            if (Module.computedProperties.has(prop)) {
              throw new Error(`You can not set property "${prop}" because it is a computed property.`);
            } else if (Module.storeBindings[prop]) {
              didChange = true;
              Store.set(Module.storeBindings[prop].path, newValue);
            } else if (!deepEqual(oldValue, newValue)) {
              didChange = true;
              internal._data[prop] = newValue;
              internal.reactions[prop] && Reactor.cueCallback(internal.reactions[prop], newValue);
              internal.dependencyGraph.has(prop) && Reactor.cueComputations(internal.dependencyGraph, internal.reactions, prop, internal.data);
            }

          }

          return didChange ? Reactor.react() : RESOLVED_PROMISE;

        }

        if (Module.storeBindings[key]) {
          return Store.set(Module.storeBindings[key].path, value);
        }

        if (Module.computedProperties.has(key)) {
          throw new Error(`You can not set property "${key}" because it is a computed property.`);
        }

        const internal = this[INTERNAL];
        const oldValue = internal._data[key]; // skip proxy

        if (deepEqual(oldValue, value)) {
          return RESOLVED_PROMISE;
        }

        internal._data[key] = value; // skip proxy

        if (internal.reactions[key]) {
          Reactor.cueCallback(internal.reactions[key], value);
        }

        if (internal.dependencyGraph.has(key)) {
          Reactor.cueComputations(internal.dependencyGraph, internal.reactions, key, internal.data);
        }

        return Reactor.react();

      }

      static get observedAttributes() {
        return observedAttributes;
      }

      attributeChangedCallback(name, oldValue_omitted, newValue) {

        const internal = this[INTERNAL];

        if (internal.initialized === true) { // only on initialized elements

          const reaction = internal.attributeChangedCallbacks[name];

          if (reaction) {
            Reactor.cueCallback(reaction, newValue);
            Reactor.react();
          }

        }

      }

    };

    // ---------------------- DEFINE CUSTOM ELEMENT ----------------------
    customElements.define(name, component);

    // ----------------------- RETURN HTML STRING FACTORY FOR EMBEDDING THE ELEMENT WITH ATTRIBUTES -----------------------
    return (attributes = {}) => {
      let htmlString = '<' + name;
      for (const att in attributes) htmlString += ` ${att}="${attributes[att]}"`;
      return htmlString += `></${name}>`;
    };

  },

  create(node, data) {

    node = node.trim();

    const element = node[0] === '<' ? document.createRange().createContextualFragment(node).firstChild : document.createElement(node);

    if (typeof data === 'object' && data !== null) {
      if (element[INTERNAL]) {
        for (const prop in data) {
          if (element[INTERNAL]._data.hasOwnProperty(prop)) {
            element[INTERNAL]._data[prop] = data[prop]; // element will self-react with this data in connectedCallback...
          } else {
            console.warn(`Cannot pass data property "${prop}" to component "${element.tagName}" because the property has not been explicitly defined in the components data model.`);
          }
        }
      } else {
        console.warn(`Cannot set data on element "${element.tagName}" because it has not been defined via Component.define!`);
      }
    }

    return element;

  }

};

// -----------------------------------

function createModule(name, config) {

  const Module = {};

  // ---------------------- TEMPLATE ----------------------
  Module.encapsulated = config.encapsulated === true;

  Module.template = document.createRange().createContextualFragment(
    `<cue-template>${config.element ? config.element.trim() : ''}</cue-template>`
  ).firstChild;

  // ---------------------- REFS ----------------------
  const _refElements = Module.template.querySelectorAll(`[${REF_ID}]`);
  Module.refNames = new Map();

  let i, k, v, tuple;
  for (i = 0; i < _refElements.length; i++) {
    k = _refElements[i].getAttribute(REF_ID);
    k && k.length && Module.refNames.set(k, `[${REF_ID}="${k}"]`);
  }

  // ---------------------- STYLES ----------------------
  Module.styles = '';
  if (typeof config.styles === 'string' && config.styles.length) {

    Module.styles = config.styles;

    // rewrite refs from "name" to [ref="name"] to allow for shorthand styling
    for (tuple of Module.refNames.entries()) {
      Module.styles = Module.styles.split(tuple[0]).join(tuple[1]); //TODO: this messes things up when two refs contain the same sequence of letters!
    }

    // not encapsulated in shadowDOM, scope all styles to name-tag
    if (Module.encapsulated === false) {
      scopeStylesToComponent(name, Module.styles);
    }

  }

  // ---------------------- REACTIONS ----------------------
  const reactions = {}; // reactionName -> Function
  if (config.reactions) {
    const assignedReactions = new Set();
    for (k in config.reactions) {
      v = config.reactions[k];
      if (typeof v !== 'function') throw new Error(`Reaction "${k}" is not a function...`);
      if (assignedReactions.has(v)) throw new Error(`Reaction "${k}" already in use. You can't use the same reaction for multiple data properties.`);
      reactions[k] = v;
      assignedReactions.add(v);
    }
  }

  // ---------------------- METHODS ----------------------
  Module.methods = {};
  for (k in config) {
    k !== 'initialize'
    && k !== 'connectedCallback'
    && k !== 'adoptedCallback'
    && k !== 'disconnectedCallback'
    && typeof config[k] === 'function'
    && (Module.methods[k] = config[k]);
  }

  // ---------------------- LIFECYCLE ----------------------
  Module.construct = ifFn(config.construct);
  Module.initialize = ifFn(config.initialize);
  Module.connected = ifFn(config.connectedCallback);
  Module.disconnected = ifFn(config.disconnectedCallback);
  Module.adopted = ifFn(config.adoptedCallback);

  // ---------------------- DATA ----------------------
  Module.data = {};
  Module.storeBindings = {};
  Module.reactions = {};

  const _allProperties = {};
  const _computedProperties = new Map();

  if (config.data) {

    for (k in config.data) {

      v = config.data[k];

      _allProperties[k] = v.value;

      if (typeof v.value === 'object' && v.value !== null && v.value.id === Store.id) {
        Module.storeBindings[k] = v.value;
      } else if (typeof v.value === 'function') {
        _computedProperties.set(k, new ComputedProperty(k, v.value));
      } else {
        Module.data[k] = v.value;
      }

      if (v.reaction) {
        if (typeof v.reaction === 'string') {
          if (!reactions[v.reaction]) throw new Error(`No Reaction with name "${v.reaction}" exists.`);
          Module.reactions[k] = reactions[v.reaction];
        } else if (typeof v.reaction === 'function') {
          if (reactions[k] || Module.reactions[k]) throw new Error(`A reaction for data property "${k}" has already been registered.`);
          Module.reactions[k] = v.reaction;
        }
      }

    }

  }

  // --------------------- ATTRIBUTES ---------------------
  Module.defaultAttributeValues = {};
  Module.attributeChangedCallbacks = {};

  if (config.attributes) {

    for (k in config.attributes) {

      v = config.attributes[k];

      if (typeof v.value !== 'undefined') {
        if (typeof v.value !== 'string') {
          throw new Error(`Attribute value for ${k} is not a String.`);
        } else {
          Module.defaultAttributeValues[k] = v.value;
        }
      }

      if (typeof v.reaction === 'string') {
        if (!reactions[v.reaction]) throw new Error(`No Reaction with name "${v.reaction}" exists.`);
        Module.attributeChangedCallbacks[k] = reactions[v.reaction];
      } else if (typeof v.reaction === 'function') {
        Module.attributeChangedCallbacks[k] = v.reaction;
      }

    }

  }

  // ---------------------- COMPUTED PROPERTIES ----------------------
  Module.computedProperties = setupComputedProperties(_allProperties, _computedProperties);

  return Module;

}

function scopeStylesToComponent(name, styles) {

  TMP_STYLESHEET.innerHTML = styles;
  document.head.appendChild(TMP_STYLESHEET);
  const tmpSheet = TMP_STYLESHEET.sheet;

  for (let i = 0, rule, text; i < tmpSheet.rules.length; i++) {

    rule = tmpSheet.rules[i];

    if (rule.type === 1) { // style
      text = rule.selectorText;
      if (text.lastIndexOf(name, 0) === 0) { // do not scope self...
        CUE_STYLESHEET.insertRule(rule.cssText);
      } else if (text.lastIndexOf('self', 0) === 0) { // replace "self" with name
        CUE_STYLESHEET.insertRule(rule.cssText.split('self').join(name));
      } else { // prefix with element tag to create scoping
        CUE_STYLESHEET.insertRule(`${name} ${rule.cssText}`);
      }
    } else if (rule.type === 7 || rule.type === 8) { // @keyframe(s)
      CUE_STYLESHEET.insertRule(rule.cssText);
    } else if (rule.type === 4 || rule.type === 12) { // @media OR @supports
      CUE_STYLESHEET.insertRule(constructScopedCSSText(name, rule));
    } else {
      console.warn(`CSS Rule of type "${rule.type}" is not currently supported by Components.`);
    }

  }

  TMP_STYLESHEET.innerHTML = '';
  document.head.removeChild(TMP_STYLESHEET);

}

function constructScopedCSSText(name, rule, cssText = '') {

  cssText += `${rule.type === 4 ? '@media' : '@supports'} ${rule.conditionText} {`;

  for (let i = 0, r; i < rule.cssRules.length; i++) {

    r = rule.cssRules[i];

    if (r.type === 1) {
      if (r.selectorText.lastIndexOf(name, 0) === 0) {
        cssText += r.cssText
      } else if (r.selectorText.lastIndexOf('self', 0) === 0) {
        cssText += r.cssText.split('self').join(name);
      } else {
        cssText += `${name} ${r.cssText}`;
      }
    } else if (r.type === 7 || r.type === 8) {
      cssText += r.cssText;
    } else if (r.type === 4 || r.type === 12) {
      cssText += constructScopedCSSText(name, r, cssText);
    } else {
      console.warn(`CSS Rule of type "${r.type}" is not currently supported by Components.`);
    }

  }

  return `${cssText} }`;

}

function assignElementReferences(parentElement, refs, names) {

  let tuple, el; //tuple[0] === refName, tuple[1] === selector
  for (tuple of names.entries()) {
    el = parentElement.querySelector(tuple[1]);
    if (!el[INTERNAL]) {
      el[INTERNAL] = {};
      el.renderEach = renderEach;
    }
    refs[tuple[0]] = el;
  }

  refs['self'] = parentElement;

}

function renderEach(dataArray, createElement, updateElement = NOOP) {

  // guard against undefined
  dataArray || (dataArray = []);

  // this function is attached directly to dom elements. "this" refers to the element
  const previousData = this[INTERNAL].childData || [];
  this[INTERNAL].childData = dataArray;

  // differentiate between encapsulated elements (have shadowDOM) and open elements
  if (dataArray.length === 0) {
    (this[INTERNAL].shadowDom || this).textContent = '';
  } else if (previousData.length === 0) {
    const el = this[INTERNAL].shadowDom || this;
    for (let i = 0; i < dataArray.length; i++) {
      el.appendChild(createElement(dataArray[i]));
    }
  } else {
    reconcile((this[INTERNAL].shadowDom || this), previousData, dataArray, createElement, updateElement);
  }

}

function reconcile(parentElement, currentArray, newArray, createFn, updateFn) {

  // optimized array reconciliation algorithm based on the following implementations
  // https://github.com/localvoid/ivi
  // https://github.com/adamhaile/surplus
  // https://github.com/Freak613/stage0

  let prevStart = 0, newStart = 0;
  let loop = true;
  let prevEnd = currentArray.length - 1, newEnd = newArray.length - 1;
  let a, b;
  let prevStartNode = parentElement.firstChild, newStartNode = prevStartNode;
  let prevEndNode = parentElement.lastChild, newEndNode = prevEndNode;
  let afterNode;

  // scan over common prefixes, suffixes, and simple reversals
  outer : while (loop) {

    loop = false;

    let _node;

    // Skip prefix
    a = currentArray[prevStart];
    b = newArray[newStart];

    while (a === b) {

      updateFn(prevStartNode, b);

      prevStart++;
      newStart++;

      newStartNode = prevStartNode = prevStartNode.nextSibling;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevStart];
      b = newArray[newStart];

    }

    // Skip suffix
    a = currentArray[prevEnd];
    b = newArray[newEnd];

    while (a === b) {

      updateFn(prevEndNode, b);

      prevEnd--;
      newEnd--;

      afterNode = prevEndNode;
      newEndNode = prevEndNode = prevEndNode.previousSibling;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevEnd];
      b = newArray[newEnd];

    }

    // Swap backward
    a = currentArray[prevEnd];
    b = newArray[newStart];

    while (a === b) {

      loop = true;
      updateFn(prevEndNode, b);

      _node = prevEndNode.previousSibling;
      parentElement.insertBefore(prevEndNode, newStartNode);
      newEndNode = prevEndNode = _node;

      newStart++;
      prevEnd--;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevEnd];
      b = newArray[newStart];

    }

    // Swap forward
    a = currentArray[prevStart];
    b = newArray[newEnd];

    while (a === b) {

      loop = true;

      updateFn(prevStartNode, b);

      _node = prevStartNode.nextSibling;
      parentElement.insertBefore(prevStartNode, afterNode);
      afterNode = newEndNode = prevStartNode;
      prevStartNode = _node;

      prevStart++;
      newEnd--;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevStart];
      b = newArray[newEnd];

    }

  }

  // Remove Node(s)
  if (newEnd < newStart) {
    if (prevStart <= prevEnd) {
      let next;
      while (prevStart <= prevEnd) {
        if (prevEnd === 0) {
          parentElement.removeChild(prevEndNode);
        } else {
          next = prevEndNode.previousSibling;
          parentElement.removeChild(prevEndNode);
          prevEndNode = next;
        }
        prevEnd--;
      }
    }
    return;
  }

  // Add Node(s)
  if (prevEnd < prevStart) {
    if (newStart <= newEnd) {
      while (newStart <= newEnd) {
        afterNode
          ? parentElement.insertBefore(createFn(newArray[newStart]), afterNode)
          : parentElement.appendChild(createFn(newArray[newStart]));
        newStart++
      }
    }
    return;
  }

  // Simple cases don't apply. Prepare full reconciliation:

  // Collect position index of nodes in current DOM
  const positions = new Array(newEnd + 1 - newStart);
  // Map indices of current DOM nodes to indices of new DOM nodes
  const indices = new Map();

  let i;

  for (i = newStart; i <= newEnd; i++) {
    positions[i] = -1;
    indices.set(newArray[i], i);
  }

  let reusable = 0, toRemove = [];

  for (i = prevStart; i <= prevEnd; i++) {

    if (indices.has(currentArray[i])) {
      positions[indices.get(currentArray[i])] = i;
      reusable++;
    } else {
      toRemove.push(i);
    }

  }

  // Full Replace
  if (reusable === 0) {

    parentElement.textContent = '';

    for (i = newStart; i <= newEnd; i++) {
      parentElement.appendChild(createFn(newArray[i]));
    }

    return;

  }

  // Full Patch around longest increasing sub-sequence
  const snake = longestIncreasingSubsequence(positions, newStart);

  // gather nodes
  const nodes = [];
  let tmpC = prevStartNode;

  for (i = prevStart; i <= prevEnd; i++) {
    nodes[i] = tmpC;
    tmpC = tmpC.nextSibling
  }

  for (i = 0; i < toRemove.length; i++) {
    parentElement.removeChild(nodes[toRemove[i]]);
  }

  let snakeIndex = snake.length - 1, tempNode;
  for (i = newEnd; i >= newStart; i--) {

    if (snake[snakeIndex] === i) {

      afterNode = nodes[positions[snake[snakeIndex]]];
      updateFn(afterNode, newArray[i]);
      snakeIndex--;

    } else {

      if (positions[i] === -1) {
        tempNode = createFn(newArray[i]);
      } else {
        tempNode = nodes[positions[i]];
        updateFn(tempNode, newArray[i]);
      }

      parentElement.insertBefore(tempNode, afterNode);
      afterNode = tempNode;

    }

  }

}

function longestIncreasingSubsequence(ns, newStart) {

  // inline-optimized implementation of longest-positive-increasing-subsequence algorithm
  // https://en.wikipedia.org/wiki/Longest_increasing_subsequence

  const seq = [];
  const is = [];
  const pre = new Array(ns.length);

  let l = -1, i, n, j;

  for (i = newStart; i < ns.length; i++) {

    n = ns[i];

    if (n < 0) continue;

    let lo = -1, hi = seq.length, mid;

    if (hi > 0 && seq[hi - 1] <= n) {

      j = hi - 1;

    } else {

      while (hi - lo > 1) {

        mid = Math.floor((lo + hi) / 2);

        if (seq[mid] > n) {
          hi = mid;
        } else {
          lo = mid;
        }

      }

      j = lo;

    }

    if (j !== -1) {
      pre[i] = is[j];
    }

    if (j === l) {
      l++;
      seq[l] = n;
      is[l] = i;
    } else if (n < seq[j + 1]) {
      seq[j + 1] = n;
      is[j + 1] = i;
    }

  }

  for (i = is[l]; l >= 0; i = pre[i], l--) {
    seq[l] = i;
  }

  return seq;

}