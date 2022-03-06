import { ReactiveObjectModel } from "../../state/internal/ReactiveObjectModel.js";
import { StateProvider } from "./StateProvider.js";

// Regex matches when $self is:
// - immediately followed by css child selector (space . : # [ > + ~) OR
// - immediately followed by opening bracket { OR
// - immediately followed by chaining comma ,
// - not followed by anything (end of line)
const $SELF_REGEXP = /(\$self(?=[\\040,{.:#[>+~]))|\$self\b/g;
const CHILD_SELECTORS = [' ','.',':','#','[','>','+','~'];
let CLASS_COUNTER = -1;

const CSS_COMPILER = document.head.appendChild(document.createElement('style'));
const CSS_COMPONENTS = document.head.appendChild(document.createElement('style'));

const DEFINED_TAGNAMES = new Set();

export class ComponentModel {

  static createTag(name, attributes) {

    let tag = '<' + name;

    if (attributes) {

      for (const attribute in attributes) {

        if (attributes.hasOwnProperty(attribute)) {

          const value = attributes[attribute];

          if (typeof value === 'string') {

            tag += ' ' + attribute + '="' + value + '"';

          } else if (attribute === 'state') {

            if (value && value._internal_) {
              tag += ' provided-state="' + StateProvider.setState(value) + '"';
            } else {
              tag += ' composed-state-data="' + StateProvider.setState(value) + '"';
            }

          }

        }

      }

    }

    return tag + '></' + name + '>';

  }

  static createNode(name, attributes, createState) {

    const element = document.createElement(name);

    if (attributes) {
      if (attributes._internal_) { // fast path
        element.state = attributes;
      } else {
        for (const attribute in attributes) {
          if (attributes.hasOwnProperty(attribute)) {
            const value = attributes[attribute];
            if (attribute === 'state') {
              if (value && value._internal_) {
                element.state = value;
              } else {
                element.state = createState(value);
              }
            } else {
              element.setAttribute(attribute, attributes[attribute]);
            }
          }
        }
      }
    }

    return element;

  }

  constructor(name, config) {

    DEFINED_TAGNAMES.add(name.toUpperCase());

    this.__name = name;

    if (config.style || config.element) {
      this.__style = config.style;
      this.__element = config.element || '';
      this.__templateReady = false;
    } else {
      this.__templateReady = true;
    }

    if (config.state) {
      this.__state = config.state;
    }

    this.initialize = config.initialize;

  }

  setupStateOnce() {

    if (this.state) {

      return true;

    } else if (this.__state) {

      const properties = {};
      const renderEvents = new Map();
      const renderListConfigs = new Map();

      for (const key in this.__state) {

        if (this.__state.hasOwnProperty(key)) {

          const entry = this.__state[key];

          properties[key] = entry.value;

          if (typeof entry.render === 'function') {

            renderEvents.set(key, entry.render);

          } else if (typeof entry.renderList === 'object') {

            renderListConfigs.set(key, entry.renderList);

          }

        }

      }

      this.state = new ReactiveObjectModel(properties);
      this.renderEvents = renderEvents;
      this.renderListConfigs = renderListConfigs;

      this.__state = null; // de-ref

      return true;

    } else {

      return false;

    }

  }

  compileTemplateOnce() {

    if (!this.__templateReady) {

      // create template element and collect refs
      const template = document.createElement('template');
      template.innerHTML = this.__element || '';
      this.content = template.content;
      this.refs = new Map(); // $ref -> replacementClass
      this.__collectElementReferences(this.content.children);

      // create scoped styles
      if (this.__style) {

        let style = this.__style;

        // Re-write $self to component-name
        style = style.replace($SELF_REGEXP, this.__name);

        // Re-write $refName(s) in style text to class selector
        for (const [$ref, classReplacement] of this.refs) {
          // replace $refName with internal .class when $refName is:
          // - immediately followed by css child selector (space . : # [ > + ~) OR
          // - immediately followed by opening bracket { OR
          // - immediately followed by chaining comma ,
          // - not followed by anything (end of line)
          style = style.replace(new RegExp("(\\" + $ref + "(?=[\\40{,.:#[>+~]))|\\" + $ref + "\b", 'g'), '.' + classReplacement);
        }

        CSS_COMPILER.innerHTML = style;
        const tmpSheet = CSS_COMPILER.sheet;

        let styleNodeInnerHTML = '', styleQueries = '';
        for (let i = 0, rule; i < tmpSheet.rules.length; i++) {

          rule = tmpSheet.rules[i];

          if (rule.type === 7 || rule.type === 8) { // do not scope @keyframes
            styleNodeInnerHTML += rule.cssText;
          } else if (rule.type === 1) { // style rule
            styleNodeInnerHTML += this.__constructScopedStyleRule(rule);
          } else if (rule.type === 4 || rule.type === 12) { // @media/@supports query
            styleQueries += this.__constructScopedStyleQuery(rule);
          } else {
            console.warn(`CSS Rule of type "${rule.type}" is not supported.`);
          }

        }

        // write queries to the end of the rules AFTER the other rules for specificity (issue #13)
        // and add styles to global stylesheet
        CSS_COMPONENTS.innerHTML += (styleNodeInnerHTML + styleQueries);
        CSS_COMPILER.innerHTML = this.__style = '';

      }

      this.__templateReady = true;

    }

  }

  __collectElementReferences(children) {

    for (let i = 0, child, ref, cls1, cls2; i < children.length; i++) {

      child = children[i];

      ref = child.getAttribute('$');

      if (ref) {
        cls1 = child.getAttribute('class');
        cls2 = ref + ++CLASS_COUNTER;
        this.refs.set('$' + ref, cls2);
        child.setAttribute('class', cls1 ? cls1 + ' ' + cls2 : cls2);
        child.removeAttribute('$');
      }

      if (child.firstElementChild && !DEFINED_TAGNAMES.has(child.tagName)) {
        this.__collectElementReferences(child.children);
      }

    }

  }

  __constructScopedStyleQuery(query, cssText = '') {

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
        cssText += this.__constructScopedStyleRule(rule, cssText);
      } else if (rule.type === 4 || rule.type === 12) { // nested query
        styleQueries += this.__constructScopedStyleQuery(rule);
      } else {
        console.warn(`CSS Rule of type "${rule.type}" is not currently supported by Components.`);
      }

    }

    // write nested queries to the end of the surrounding query (see issue #13)
    cssText += styleQueries + ' }';

    return cssText;

  }

  __constructScopedStyleRule(rule) {

    let cssText = '';

    if (rule.selectorText.indexOf(',') > -1) {

      const selectors = rule.selectorText.split(',');
      const scopedSelectors = [];

      for (let i = 0, selector; i < selectors.length; i++) {

        selector = selectors[i].trim();

        if (selector.lastIndexOf(':root', 0) === 0) { // escape context (dont scope) :root notation
          scopedSelectors.push(selector.replace(':root', ''));
        } else if (this.__isTopLevelSelector(selector, this.__name)) { // dont scope component-name
          scopedSelectors.push(selector);
        } else { // prefix with component-name to create soft scoping
          scopedSelectors.push(this.__name + ' ' + selector);
        }

      }

      cssText += scopedSelectors.join(', ') + rule.cssText.substr(rule.selectorText.length);

    } else {

      if (rule.selectorText.lastIndexOf(':root', 0) === 0) { // escape context (dont scope) :root notation
        cssText += rule.cssText.replace(':root', ''); // remove first occurrence of :root
      } else if (this.__isTopLevelSelector(rule.selectorText)) { // dont scope component-name
        cssText += rule.cssText;
      } else { // prefix with component-name to create soft scoping
        cssText += this.__name + ' ' + rule.cssText;
      }

    }

    return cssText;

  }

  __isTopLevelSelector(selectorText) {
    if (selectorText === this.__name) {
      return true;
    } else if (selectorText.lastIndexOf(this.__name, 0) === 0) { // starts with componentName
      return CHILD_SELECTORS.indexOf(selectorText.charAt(this.__name.length)) > -1; // character following componentName is valid child selector
    } else { // nada
      return false;
    }
  }

}