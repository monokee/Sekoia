
// Cue UI Component Instance available as "this" in component lifecycle methods.
// Provides access to the raw dom element, imports, keyframes and styles
// Exposes shorthands and utility methods that allow for DOM and STATE querying, manipulation and binding.

class CueUIComponent {

  constructor(element, imports, styles, keyframes) {

    this.element = element;

    this.imports = imports;

    this.keyframes = keyframes;
    this.styles = styles;

    // In case component-scope classes have been generated in a styles object, we map default classNames to unique classNames internally.
    // overwrite element.classList with mapped implementation
    if (styles && Object.keys(styles).length) {
      Object.defineProperty(element, 'classList', {
        value: new MappedClassList(styles, element),
        enumerable: true,
        writable: false,
        configurable: true
      });
    }

  }

  getRefs() {

    // collect children of element that have "ref" attribute
    // returns object hash that maps refValue to domElement

    const tagged = this.element.querySelectorAll('[ref]');

    if (tagged.length) {
      const refs = {};
      for (let i = 0, r; i < tagged.length; i++) {
        r = tagged[i];
        refs[r.getAttribute('ref')] = r;
      }
      return refs;
    }

  }

  getIndex() {
    // return the index of the wrapped element within the childList of its parent
    const children = this.element.parentNode.children;
    for (let i = 0; i < children.length; i++) {
      if (children[i] === this.element) return i;
    }
    return -1;
  }

  getSiblings(includeSelf = false) {

    if (includeSelf) {
      return Array.from(this.element.parentNode.children);
    } else {
      const siblings = [];
      const children = this.element.parentNode.children;
      for (let i = 0; i < children.length; i++) {
        if (children[i] !== this.element) {
          siblings.push(children[i]);
        }
      }
      return siblings;
    }

  }

  getBoundingBox() {
    // clone and offset in case element is invisible
    const clone = this.element.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.left = '-100000px';
    clone.style.top = '-100000px';
    clone.style.display = 'block';
    this.element.parentElement.appendChild(clone);
    const bb = clone.getBoundingClientRect();
    clone.parentElement.removeChild(clone);
    return bb;
  }

  setChildren({from = [], to, create, update = NOOP}) {

    // the preferred method for updating a list of children after the underlying data model for a rendered list has changed.
    // performs smart checking and optimized reconciliation to ensure only the minimum amount of dom-work is performed per update.

    // "from" and "to" are raw data arrays which are formatted into dom elements by calling "create" or "update" on each item.
    // "create" is a function that requires a single data-entry from the "to" array and returns a dom element. (likely a Cue.Component function).
    // "update" is a function that updates existing elements. It requires two arguments: (domElement, newData). How the newData is rendered into the domElement is specified explicitly in the function body.
    // "update" defaults to noop because in most cases property / attribute updates are handled by children themselves
    // "update" is only required for non-reactive or primitive children in data array
    // "update" hence offers a very fast alternative for rendering when it doesn't make sense for each array item to be an observe reactive state modules

    // fast path clear all
    if (to.length === 0) {
      this.element.textContent = '';
      return;
    }

    // fast path create all
    if (from.length === 0) {
      for(let i = 0; i < to.length; i++) {
        parent.appendChild(create(to[i]))
      }
      return;
    }

    // reconcile current/new newData arrays
    reconcile(this.element, from, to, create, update);

  }

  observe(state, property, handler, autorun = true) {

    const stateInstance = state[__CUE__];
    const reactions = stateInstance.observersOf;

    if (typeof property === 'string' && typeof handler === 'function') {

      stateInstance.subscribe(property, handler);

      if (autorun === true) {
        handler({
          property: property,
          value: state[property],
          oldValue: state[property]
        });
      }

    } else if (property.constructor === Object && property !== null) {

      const _autorun = typeof handler === 'boolean' ? handler : autorun;

      let prop, hndlr;

      for (prop in property) {

        hndlr = property[prop];

        if (typeof hndlr !== 'function') {
          throw new TypeError(`Property change reaction for "${prop}" is not a function...`);
        }

        if (reactions.has(prop)) {
          reactions.get(prop).push(hndlr);
        } else {
          reactions.set(prop, [ hndlr ]);
        }

        if (_autorun === true) {
          hndlr({
            property: prop,
            value: state[prop],
            oldValue: state[prop]
          });
        }

      }

    }

  }

  unobserve(property) {

    const reactor = REACTORS.get(this.element);

    if (reactor) {

      if (typeof property === 'object' && property) {
        reactor.unobserveProperties(property);
      } else {
        reactor.unobserveProperty(property);
      }

    } else {
      throw new ReferenceError(`Can't unobserve because element is not observing any state.`);
    }

  }

  on(type, handler, options) {

    // element.addEventListener convenience method which accepts a plain object of multiple event -> handlers
    // since we're always binding to the root element, we facilitate event delegation. handlers can internally compare e.target to refs or children.

    if (arguments.length === 1 && type && type.constructor === Object) {
      for (const eventType in type) {
        this.element.addEventListener(eventType, type[eventType], handler && typeof handler === 'object' ? handler : {});
      }
    } else if (typeof handler === 'function') {
      this.element.addEventListener(type, handler, options || {});
    } else {
      throw new TypeError(`Can't bind event listener(s) because of invalid arguments.`);
    }

  }

  off(type, handler) {

    if (arguments.length === 1 && type && type.constructor === Object) {
      for (const eventType in type) {
        this.element.removeEventListener(eventType, type[eventType]);
      }
    } else if (typeof handler === 'function') {
      this.element.removeEventListener(type, handler);
    } else {
      throw new TypeError(`Can't remove event listener(s) because of invalid arguments.`);
    }

  }

}