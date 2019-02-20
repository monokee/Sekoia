
// Cue UI Component Instance available as "this" in component lifecycle methods.
// Provides access to the raw dom element, imports, keyframes and styles
// Don't refactor to Pojo (used for instanceof checks)
const ComponentInstance = wrap(() => {

  const doc = document;
  const isNodeListProto = NodeList.prototype.isPrototypeOf;
  const isHTMLCollectionProto = HTMLCollection.prototype.isPrototypeOf;

  const childDataCache = new WeakMap();

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

    constructor(element, imports, styles) {

      this.element = element;
      this.imports = imports;
      this.styles = styles;
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

    setChildren(parentNode, dataArray, createElement, updateElement = NOOP) {

      // weak-cache previous child data
      const previousData = childDataCache.get(parentNode) || [];
      childDataCache.set(parentNode, dataArray.slice());

      if (dataArray.length === 0) { // fast path clear all
        parentNode.textContent = '';
      } else if (previousData.length === 0) { // fast path add all
        for(let i = 0; i < dataArray.length; i++) {
          parentNode.appendChild(createElement(dataArray[i]));
        }
      } else { // reconcile current/new newData arrays
        reconcile(parentNode, previousData, dataArray, createElement, updateElement);
      }

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