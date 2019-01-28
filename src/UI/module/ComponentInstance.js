
// Cue UI Component Instance available as "this" in component lifecycle methods.
// Provides access to the raw dom element, imports, keyframes and styles
// Don't refactor to Pojo (used for instanceof checks)
const ComponentInstance = wrap(() => {

  const isArray = Array.isArray;
  const toArray = Array.from;
  const isObjectLike = o => typeof o === 'object' && o !== null;
  const doc = document;
  const isNodeListProto = NodeList.prototype.isPrototypeOf;
  const isHTMLCollectionProto = HTMLCollection.prototype.isPrototypeOf;

  const transitionEventTypes = (() => {

    const el = document.createElement('tst'), ts = {
      'transition': {
        run: 'transitionrun',
        start: 'transitionstart',
        end: 'transitionend'
      },
      'WebkitTransition': {
        run: 'webkitTransitionRun',
        start: 'webkitTransitionStart',
        end: 'webkitTransitionEnd'
      },
      'MozTransition': {
        run: 'transitionRun',
        start: 'transitionStart',
        end: 'transitionEnd'
      },
      'MSTransition': {
        run: 'msTransitionRun',
        start: 'msTransitionStart',
        end: 'msTransitionEnd'
      },
      'OTransition': {
        run: 'oTransitionRun',
        start: 'oTransitionStart',
        end: 'oTransitionEnd'
      },
    };

    for (const t in ts) if (el.style[t]) return ts[t];

  })();

  return class ComponentInstance {

    constructor(element, imports, styles, keyframes) {

      this.element = element;
      this.imports = imports;
      this.styles = styles && oKeys(styles).length ? new MappedClassList(styles, element) : null;
      this.keyframes = keyframes || null;
      this.on('click', e => {}, {once: true});
      this.on('.child', 'click', e => {}, {once: true});
      this.on({click: e => {}}, {once: true});
      this.on(this.element.firstChild, {})

    }

    select(x, within) {

      // TODO: selector needs to account for scoped classNames!

      if (typeof x === 'string') {

        const parent = within ? this.select(within) : this.element;
        let node;

        switch(x[0]) {
          case '#':
            node = doc.getElementById(x.substring(1));
            break;
          case '.':
            node = parent.getElementsByClassName(x.substring(1));
            break;
          default:
            node = parent.querySelectorAll(x);
            break;
        }

        if (node.nodeType !== Node.TEXT_NODE && node.length) {
          return node.length > 1 ? toArray(node) : node[0];
        }

        return node;

      }

      if (x instanceof Element) return x;

      if (Cue.UI.isComponent(x)) return x.element;

      if (isNodeListProto(x) || isHTMLCollectionProto(x)) return toArray(x);

      if (isArray(x)) return x.map(item => this.select(item, within));

      if (typeof x === 'object' && x !== null) {
        const o = {};
        for (const item in x) o[item] = this.select(x[item], within);
        return o;
      }

    }

    hasContent(node) {
      node = node ? this.select(node) : this.element;
      return !!(node.children.length || node.textContent.trim().length);
    }

    isIterable(node) {
      node = node ? this.select(node) : this.element;
      return node.nodeType !== Node.TEXT_NODE && node.length;
    }

    getIndex(node) {
      node = node ? this.select(node) : this.element;
      return toArray(node.parentNode.children).indexOf(node);
    }

    getSiblings(node, includeSelf = false) {
      node = node ? this.select(node) : this.element;
      return includeSelf ? toArray(node.parentNode.children) : toArray(node.parentNode.children).filter(sibling => sibling !== node);
    }

    getRefs(parentNode) {

      // collect children of element that have "ref" attribute
      // returns object hash that maps refValue to domElement
      parentNode = parent ? this.select(parentNode) : this.element;
      const tagged = parentNode.querySelectorAll('[ref]');

      if (tagged.length) {
        const refs = {};
        for (let i = 0, r; i < tagged.length; i++) {
          r = tagged[i];
          refs[r.getAttribute('ref')] = r;
        }
        return refs;
      }

    }

    getBoundingBox(node) {
      node = node ? this.select(node) : this.element;
      // clone and offset in case element is invisible
      const clone = node.cloneNode(true);
      clone.style.position = 'absolute';
      clone.style.left = '-100000px';
      clone.style.top = '-100000px';
      clone.style.display = 'block';
      this.element.parentElement.appendChild(clone);
      const bb = clone.getBoundingClientRect();
      clone.parentElement.removeChild(clone);
      return bb;
    }

    awaitTransition(...nodes) {
      nodes = nodes.length ? nodes.map(node => this.select(node)) : [this.element];
      return Promise.all(nodes.map(node => {
        if (transitionEventTypes.end) {
          return new Promise(resolve => {
            const _node = this.select(node);
            const handler = () => {
              _node.removeEventListener(transitionEventTypes.end, handler);
              resolve();
            };
            _node.addEventListener(transitionEventTypes.end, handler);
          });
        } else {
          return Promise.resolve();
        }
      }));
    }

    setChildren(node, {from = [], to, create, update = NOOP}) {

      node = node ? this.select(node) : this.element;

      // the preferred method for updating a list of children after the underlying data model for a rendered list has changed.
      // performs smart checking and optimized reconciliation to ensure only the minimum amount of dom-work is performed per update.

      // "from" and "to" are raw data arrays which are formatted into dom elements by calling "create" or "update" on each item.
      // "create" is a function that requires a single data-entry from the "to" array and returns a dom element. (likely a Cue.Component function).
      // "update" is a function that updates existing elements. It requires two arguments: (domElement, newData). How the newData is rendered into the domElement is specified explicitly in the function body.
      // "update" defaults to noop because in most cases property / attribute updates are handled by children themselves
      // "update" is only required for non-reactive or primitive children in data array
      // "update" hence offers a very fast alternative for rendering when it doesn't make sense for each array item to be an observe reactive State module

      // fast path clear all
      if (to.length === 0) {
        node.textContent = '';
        return;
      }

      // fast path create all
      if (from.length === 0) {
        for(let i = 0; i < to.length; i++) {
          node.appendChild(create(to[i]))
        }
        return;
      }

      // reconcile current/new newData arrays
      reconcile(node, from, to, create, update);

    }

    observe(state, scope, property, handler, autorun = true) {

      //TODO: likely create link between element and state at this point (hooks?!)
      const stateInstance = state[__CUE__];

      if (typeof property === 'string') {

        const boundHandler = stateInstance.addChangeReaction(property, handler, scope);

        if (autorun === true) {
          boundHandler({
            property: property,
            value: state[property],
            oldValue: state[property]
          });
        }

        return boundHandler;

      } else if (isObjectLike(property)) {

        const _autorun = typeof handler === 'boolean' ? handler : autorun;
        const boundHandlers = {};

        let prop, boundHandler;

        for (prop in property) {

          boundHandler = stateInstance.addChangeReaction(prop, property[prop], scope);

          boundHandlers[prop] = boundHandler;

          if (_autorun === true) {
            boundHandler({
              property: prop,
              value: state[prop],
              oldValue: state[prop]
            });
          }

        }

        return boundHandlers;

      }

    }

    unobserve(state, property, handler) {

      const stateInstance = state[__CUE__];

      if (typeof property === 'string') {

        stateInstance.removeChangeReaction(property, handler);

      } else if (property.constructor === OBJ && property !== null) {

        for (const prop in property) {
          stateInstance.removeChangeReaction(prop, property[prop]);
        }

      }

    }

    on(node, type, handler, options) {

      // TODO: refactor. live-delegate within element if selector is passed.
      node = this.select(node);

      // element.addEventListener convenience method which accepts a plain object of multiple event -> handlers
      // since we're always binding to the root element, we facilitate event delegation. handlers can internally compare e.target to refs or children.

      if (arguments.length === 2 && isObjectLike(type)) {
        for (const eventType in type) {
          node.addEventListener(eventType, type[eventType], isObjectLike(handler) ? handler : {});
        }
      } else if (typeof handler === 'function') {
        node.addEventListener(type, handler, options || {});
      } else {
        throw new TypeError(`Can't bind event listener(s) because of invalid arguments.`);
      }

    }

    off(node, type, handler) {

      node = this.select(node);

      if (arguments.length === 2 && isObjectLike(type)) {
        for (const eventType in type) {
          node.removeEventListener(eventType, type[eventType]);
        }
      } else if (typeof handler === 'function') {
        node.removeEventListener(type, handler);
      } else {
        throw new TypeError(`Can't remove event listener(s) because of invalid arguments.`);
      }

    }

    insertBefore(node, target) {
      target.parentNode.insertBefore(node, target);
      return this;
    }

    insertAfter(node, target) {
      target.parentNode.insertBefore(node, target.nextSibling);
      return this;
    }

    insertAt(node, index) {

      const parent = node.parentNode, children = parent.children;

      if (index >= children.length) {
        parent.appendChild(node);
      } else if (index <= 0) {
        parent.insertBefore(node, parent.firstChild);
      } else {
        parent.insertBefore(node, children[index >= Array.from(children).indexOf(node) ? index + 1 : index]);
      }

      return this;

    }

    detach(node) {
      return node.parentNode.removeChild(node);
    }

    remove(node) {
      node.parentNode.removeChild(node);
      return this;
    }

  }

});