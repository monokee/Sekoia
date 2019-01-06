
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

  observe(state, property, handler, autorun) {

    // the dom element that is already wrapped into the component will be further wrapped into a Reactor. so now the Component has a Reactor which is the glue between the element and the state.

    // high level method which delegates a number of internal processes
    // which are required to bind an element to a state model so we can
    // auto-react with the element whenever a specified property value on the state model has changed.

    // TODO: use a more loosely coupled event system -> at least for reactions. tighter coupling for derivatives is okay but this is a mess!

    const reactor = REACTORS.get(this.element) || (
      REACTORS.set(
        this.element,
        new Reactor(this.element).attachTo(state)
      ).get(this.element)
    );

    if (typeof property === 'object' && property) {
      reactor.observeProperties(property, typeof handler === 'boolean' ? handler : true);
    } else {
      reactor.observeProperty(property, handler, autorun || true);
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