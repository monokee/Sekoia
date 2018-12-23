
//TODO: most likely obsolete -> replaced by UI Prototype
assign(CUE_PROTO, {
  
  createElement(tagName, options, target) {

    // enhanced createElement function that accepts an options pojo of
    // dom attributes, properties and child elements that are added to the created element

    let prop = '', val = null, key = '';

    const $root = document.createElement(tagName);

    for(prop in options) {

      val = options[prop];

      if (prop === 'dataset' || prop === 'style') {

        for (key in val) {
          $root[prop][key] = val[key];
        }

      } else if (prop === 'classList') {

        const classes = isArray(val) ? val : typeof val === 'string' ? val.split(' ') : val;

        for (let i = 0; i < classes.length; i++) {
          $root.classList.add(classes[i]);
        }

      } else if (prop === 'children') {

        if (typeof val === 'object' && val !== null && !val.nodeName) {

          for (key in val) {
            $root.appendChild(this.nodify(val[key]));
          }

        } else if (val.nodeName || val instanceof Element) {

          $root.appendChild(val);

        }

      } else if (prop === 'attributes') {

        for (key in val) {
          $root.setAttribute(key, val[key]);
        }

      } else {

        $root[prop] = val;

      }

    }

    return target ? this.nodify(target).appendChild($root) : $root;

  },

  nodify(x) {

    if (typeof x === 'string') {

      x = x.trim();
      let y = null;

      switch (x[0]) {
        case '<':
          y = document.createRange().createContextualFragment(x);
          return y.children.length === 1 ? y.firstChild : y;
        case '.':
          y = document.getElementsByClassName(x.substring(1));
          return y.length === 1 ? y[0] : y;
        case '#':
          return document.getElementById(x.substring(1));
        case '[':
          y = document.querySelectorAll(x);
          return y.length === 1 ? y[0] : y;
        default:
          return document.createTextNode(x);
      }

    } else if (x.nodeName || x instanceof Element) {

      return x;

    } else if (isArray(x)) {

      return x.map(v => this.nodify(v));

    } else if (typeof x === 'object') {

      const domHash = {};
      let n;
      for (n in x) domHash[n] = this.nodify(x[n]);
      return domHash;

    }

  },

  hasNodeContent(node) {
    return !!(node.children.length || node.textContent.trim().length);
  },

  isNodeIterable(node) {
    return node.nodeType !== Node.TEXT_NODE && node.length;
  },

  getNodeIndex(node) {
    return Array.from(node.parentNode.children).indexOf(node);
  },

  getNodeSiblings(node, includeSelf = false) {
    return includeSelf ? Array.from(node.parentNode.children) : Array.from(node.parentNode.children).filter(sibling => sibling !== node);
  },

  insertNodeBefore(node, target) {
    target.parentNode.insertBefore(node, target);
    return this;
  },

  insertNodeAfter(node, target) {
    target.parentNode.insertBefore(node, target.nextSibling);
    return this;
  },

  insertNodeAt(node, index) {

    const parent = node.parentNode, children = parent.children;

    if (index >= children.length) {
      parent.appendChild(node);
    } else if (index <= 0) {
      parent.insertBefore(node, parent.firstChild);
    } else {
      parent.insertBefore(node, children[index >= Array.from(children).indexOf(node) ? index + 1 : index]);
    }

    return this;

  },

  detachNode(node) {
    return node.parentNode.removeChild(node);
  },

  removeNode(node) {
    node.parentNode.removeChild(node);
    return this;
  },

  getNodeDimensions(node) {
    // clone in case node is invisible
    const clone = node.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.left = '-100000px';
    clone.style.top = '-100000px';
    clone.style.display = 'block';
    node.parentElement.appendChild(clone);
    const dim = clone.getBoundingClientRect();
    clone.parentElement.removeChild(clone);
    return dim;
  },

  applyStyles(node, stylesObject) {
    
    let style;
    for (style in stylesObject) {
      if (style[0] === '_') {
        const noprefix = style.substring(1);
        node.style['Webkit' + noprefix] = stylesObject[style];
        node.style['Moz' + noprefix] = stylesObject[style];
        node.style['O' + noprefix] = stylesObject[style];
        node.style['MS' + noprefix] = stylesObject[style];
        node.style[noprefix] = stylesObject[style];
      } else {
        node.style[style] = stylesObject[style];
      }
    }

    return this;

  },

  mergeClasses(...classes) {
    // merge any form of class lists (array, space separated string lists, with or without dot notation
    // into array of ['class', 'names' 'sans' 'dots']
    return this.flattenArray(this.flattenArray(classes.map(c => c.split(' ').map(c => c.split('.').join('')))));
  },

  swapClasses(node, classA, classB) {

    if (node.classList.contains(classA)) {
      node.classList.remove(classA);
      node.classList.add(classB);
    } else {
      node.classList.remove(classB);
      node.classList.add(classA);
    }

    return this;

  },

  transitionEventTypes: (function() {
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
  })(),

  awaitTransition(...nodes) {
    return Promise.all(nodes.map(node => {
      if (this.transitionEventTypes.end) {
        return new Promise(resolve => {
          const handler = e => {
            node.removeEventListener(this.transitionEventTypes.end, handler);
            resolve();
          };
          node.addEventListener(this.transitionEventTypes.end, handler);
        });
      } else {
        return Promise.resolve();
      }
    }));
  },

  nodeDataExpando: Symbol('Node Data'),

  setNodeData(node, data) {
    if (typeof data === 'object') {
      const nodeData = node[this.nodeDataExpando] || (node[this.nodeDataExpando] = isArray(data) ? [] : {});
      let prop;
      for (prop in data) {
        nodeData[prop] = data[prop];
        node.dataset[prop] = typeof data[prop] === 'object' ? JSON.stringify(data[prop]) : data[prop];
      }
    }
    return this;
  },

  getNodeData(node, property) {
    return property ? node[this.nodeDataExpando][property] : node[this.nodeDataExpando];
  },

  removeNodeData(node, property) {
    if (property) {
      if (node[this.nodeDataExpando] && node.dataset) {
        node.removeAttribute(`data-${this.dashedCase(property)}`);
        delete node[this.nodeDataExpando][property];
      }
    } else {
      let prop;
      for (prop in node[this.nodeDataExpando]) {
        node.removeAttribute(`data-${this.dashedCase(prop)}`);
        delete node[this.nodeDataExpando][prop];
      }
    }
  }

});