
Cue.Plugin('cue-ui', Library => {

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

  return Object.assign(Library.ui, {

    select(x) {

      if (typeof x === 'string') {

        let node;

        switch(x[0]) {
          case '#':
            node = document.getElementById(x.substring(1));
            break;
          case '.':
            node = document.getElementsByClassName(x.substring(1));
            break;
          default:
            node = document.querySelectorAll(x);
            break;
        }

        if (node.nodeType !== Node.TEXT_NODE && node.length) {
          return node.length > 1 ? Array.from(node) : node[0];
        }

        return node;

      } else if (typeof x === 'object' && x !== null) {

        if (Cue.UI.isComponent(x)) {
          return x.element;
        }

        if (x instanceof Element) {
          return x;
        }

        if (NodeList.prototype.isPrototypeOf(x) || HTMLCollection.prototype.isPrototypeOf(x)) {
          return Array.from(x);
        }

        if (Array.isArray(x)) {
          return x.map(item => this.select(item));
        }

        const o = {};
        for (const item in x) o[item] = this.select(x[item]);
        return o;

      } else {

        return null;

      }

    },

    html(str) {

      if (typeof str !== 'string') {
        throw new TypeError(`Can't create DOM element(s) from non-string of type ${typeof str}.`);
      }

      str = str.trim();

      if (str[0] !== '<') {
        throw new TypeError(`Invalid String format. HTML strings must start with "<".`);
      }

      const dom = document.createRange().createContextualFragment(str);
      return dom.children.length === 1 ? dom.firstChild : dom;

    },

    hasContent(node) {
      node = this.select(node);
      return !!(node.children.length || node.textContent.trim().length);
    },

    isIterable(node) {
      node = this.select(node);
      return node.nodeType !== Node.TEXT_NODE && node.length;
    },

    getIndex(node) {
      node = this.select(node);
      return Array.from(node.parentNode.children).indexOf(node);
    },

    getSiblings(node, includeSelf = false) {
      node = this.select(node);
      return includeSelf ? Array.from(node.parentNode.children) : Array.from(node.parentNode.children).filter(sibling => sibling !== node);
    },

    awaitTransition(...nodes) {
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
    },

  });

}, true);