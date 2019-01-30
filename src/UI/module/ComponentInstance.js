
// Cue UI Component Instance available as "this" in component lifecycle methods.
// Provides access to the raw dom element, imports, keyframes and styles
// Don't refactor to Pojo (used for instanceof checks)
const ComponentInstance = wrap(() => {

  const doc = document;
  const isNodeListProto = NodeList.prototype.isPrototypeOf;
  const isHTMLCollectionProto = HTMLCollection.prototype.isPrototypeOf;

  const transitionEventTypes = (() => {

    const el = doc.createElement('tst'), ts = {
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
      this.styles = styles;
      this.keyframes = keyframes;
      this.reactions = new Map();
      this.events = new Map();
      this.autorun = true;

    }

    select(x, within) {

      if (typeof x === 'string') {

        within = within ? this.select(within) : this.element;
        let node, s;

        switch(x[0]) {
          case '#':
            node = doc.getElementById(x.substring(1));
            break;
          case '.':
            node = within.getElementsByClassName(this.styles.get((s = x.substring(1))) || s);
            break;
          default:
            node = within.querySelectorAll(x);
            break;
        }

        if (node.nodeType !== Node.TEXT_NODE && node.length) {
          return node.length === 1 ? node[0] : toArray(node);
        }

        return node;

      }

      if (x instanceof Element) return x;

      if (Cue.UI.isComponent(x)) return x.element;

      if (isNodeListProto(x) || isHTMLCollectionProto(x)) return toArray(x);

      if (isArray(x)) return x.map(item => this.select(item, within));

      if (isObjectLike(x)) {
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

    hasClass(node, className) {

      if (arguments.length === 1) {
        className = node;
        node = this.element;
      } else {
        node = this.select(node);
      }

      return node.classList.contains(this.styles.get(className) || className);

    }

    addClass(node, className) {

      let classNames;

      if (arguments.length === 1) {
        classNames = node.split(' ').map(token => (this.styles.get(token) || token));
        node = this.element;
      } else {
        node = this.select(node);
        classNames = className.split(' ').map(token => (this.styles.get(token) || token));
      }

      node.classList.add(...classNames);

      return this;

    }

    removeClass(node, className) {

      let classNames;

      if (arguments.length === 1) {
        classNames = node.split(' ').map(token => (this.styles.get(token) || token));
        node = this.element;
      } else {
        node = this.select(node);
        classNames = className.split(' ').map(token => (this.styles.get(token) || token));
      }

      node.classList.remove(...classNames);

      return this;

    }

    toggleClass(node, className) {

      if (arguments.length === 1) {
        className = node;
        node = this.element;
      } else {
        node = this.select(node);
      }

      node.classList.toggle(this.styles.get(className) || className);

      return this;

    }

    replaceClass(node, oldClass, newClass) {

      if (arguments.length === 2) {
        oldClass = node;
        newClass = oldClass;
        node = this.element;
      } else {
        node = this.select(node);
      }

      node.classList.replace(this.styles.get(oldClass) || oldClass, this.styles.get(newClass) || newClass);

      return this;

    }

    index(node) {
      node = node ? this.select(node) : this.element;
      return toArray(node.parentNode.children).indexOf(node);
    }

    siblings(node, includeSelf) {

      if (arguments.length === 1) {
        includeSelf = node === true;
        node = this.element;
      } else {
        node = this.select(node);
      }

      return includeSelf ? toArray(node.parentNode.children) : toArray(node.parentNode.children).filter(sibling => sibling !== node);
    }

    refs(within) {

      // collect children of element that have "ref" attribute
      // returns object hash that maps refValue to domElement
      within = within ? this.select(within) : this.element;
      const tagged = within.querySelectorAll('[ref]');

      if (tagged.length) {
        const refs = {};
        for (let i = 0, r; i < tagged.length; i++) {
          r = tagged[i];
          refs[r.getAttribute('ref')] = r;
        }
        return refs;
      }

    }

    boundingBox(node) {
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

    position(node) {
      node = node ? this.select(node) : this.element;
      return {
        top: node.offsetTop,
        left: node.offsetLeft
      };
    }

    offset(node) {
      node = node ? this.select(node) : this.element;
      const rect = node.getBoundingClientRect();
      return {
        top: rect.top + document.body.scrollTop,
        left: rect.left + document.body.scrollLeft
      };
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

      node = arguments.length === 1 ? this.element : this.select(node);

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
        return this;
      }

      // fast path create all
      if (from.length === 0) {
        for(let i = 0; i < to.length; i++) {
          node.appendChild(create(to[i]))
        }
        return this;
      }

      // reconcile current/new newData arrays
      reconcile(node, from, to, create, update);

      return this;

    }

    insertBefore(node, target) {
      if (arguments.length === 1) {
        target = this.select(node);
        node = this.element;
      } else {
        node = this.select(node);
        target = this.select(target);
      }
      target.parentNode.insertBefore(node, target);
      return this;
    }

    insertAfter(node, target) {
      if (arguments.length === 1) {
        target = this.select(node);
        node = this.element;
      } else {
        node = this.select(node);
        target = this.select(target);
      }
      target.parentNode.insertBefore(node, target.nextSibling);
      return this;
    }

    insertAt(node, index) {

      if (arguments.length === 1) {
        index = parseInt(node);
        node = this.element;
      } else {
        node = this.select(node);
        index = parseInt(index);
      }

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
      node = node ? this.select(node) : this.element;
      return node.parentNode.removeChild(node);
    }

    remove(node) {
      node = node ? this.select(node) : this.element;
      node.parentNode.removeChild(node);
      return this;
    }

  }

});