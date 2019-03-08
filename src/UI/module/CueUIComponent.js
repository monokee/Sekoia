
const CueUIComponent = wrap(() => {

  const isNodeListProto = NodeList.prototype.isPrototypeOf;
  const isHTMLCollectionProto = HTMLCollection.prototype.isPrototypeOf;

  const transitionEventTypes = wrap(() => {

    const el = DOC.createElement('tst'), ts = {
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

  });
  
  const __STYLES__ = Symbol('ScopedStyles');
  const __CHILD_DATA__ = Symbol('ChildData');

  return class CueUIComponent {

    constructor(element, scopedStyles) {

      this.element = element;
      element[__CUE__] = this;

      this[__STYLES__] = scopedStyles;
      this[__CHILD_DATA__] = [];

    }

    get(x) {

      if (typeof x === 'string') {

        let el, s;

        switch(x[0]) {
          case '#':
            el = DOC.getElementById(x.substring(1));
            break;
          case '.':
            el = this.element.getElementsByClassName(this[__STYLES__].get((s = x.substring(1))) || s);
            break;
          default:
            el = this.element.querySelectorAll(x);
            break;
        }

        if (el.nodeType !== Node.TEXT_NODE && el.length) {
          return el.length === 1 ? el[0][__CUE__] || new CueUIComponent(el[0], this[__STYLES__]) : toArray(el).map(el => el[__CUE__] || new CueUIComponent(el, this[__STYLES__]));
        }

        return el[__CUE__] || new CueUIComponent(el, this[__STYLES__]);

      } else if (x instanceof Element) {

        return x[__CUE__] || new CueUIComponent(x, this[__STYLES__]);

      } else if (isNodeListProto(x) || isHTMLCollectionProto(x)) {

        return toArray(x).map(el => el[__CUE__] || new CueUIComponent(el, this[__STYLES__]));

      } else if (x && x[__STYLES__]) {

        return x;

      }

    }

    getSiblings(includeSelf = false) {

      const children = this.element.parentNode.childNodes;
      const siblings = [];

      if (includeSelf === true) {
        for (let i = 0, el; i < children.length; i++) {
          el = children[i];
          siblings.push(el[__CUE__] || new CueUIComponent(el, this[__STYLES__]));
        }
      } else {
        for (let i = 0, el; i < children.length; i++) {
          el = children[i];
          if (el !== this.element) {
            siblings.push(el[__CUE__] || new CueUIComponent(el, this[__STYLES__]));
          }
        }
      }

      return siblings;

    }

    getChildren() {
      const children = toArray(this.element.parentNode.childNodes);
      for (let i = 0, el; i < children.length; i++) {
        el = children[i];
        children[i] = el[__CUE__] || new CueUIComponent(el, this[__STYLES__]);
      }
      return children;
    }

    setChildren(dataArray, createElement, updateElement = NOOP) {

      const previousData = this[__CHILD_DATA__];
      this[__CHILD_DATA__] = dataArray.slice();

      if (dataArray.length === 0) {

        this.element.textContent = '';

      } else if (previousData.length === 0) {

        for(let i = 0; i < dataArray.length; i++) {
          this.element.appendChild(createElement(dataArray[i]));
        }

      } else {

        reconcile(this.element, previousData, dataArray, createElement, updateElement);

      }


      return this;

    }

    append(x) {
      if (x instanceof Element) {
        this.element.appendChild(x);
      } else if (x && x[__STYLES__]) {
        this.element.appendChild(x.element);
      }
      return this;
    }

    appendTo(target) {
      if (target instanceof Element) {
        target.appendChild(this.element);
      } else if (target && target[__STYLES__]) {
        target.element.appendChild(this.element);
      }
      return this;
    }

    insertBefore(target) {
      if (target instanceof Element) {
        target.parentNode.insertBefore(this.element, target);
      } else if (target && target[__STYLES__] || (target = this.get(target))) {
        target.element.parentNode.insertBefore(this.element, target.element);
      }
      return this;
    }

    insertAfter(target) {
      if (target instanceof Element) {
        target.parentNode.insertBefore(this.element, target.nextSibling);
      } else if (target && target[__STYLES__] || (target = this.get(target))) {
        target.element.parentNode.insertBefore(this.element, target.element.nextSibling);
      }
    }

    moveTo(index, target) {
      target = target ? this.get(target) : this.element.parentNode;
      const children = target.children;
      if (index >= children.length) {
        target.appendChild(this.element);
      } else if (index <= 0) {
        target.insertBefore(this.element, target.firstChild);
      } else {
        target.insertBefore(this.element, children[index >= toArray(children).indexOf(this.element) ? index + 1 : index]);
      }
      return this;
    }

    getText() {
      return this.element.textContent;
    }

    setText(value) {
      this.element.textContent = value;
      return this;
    }

    getAttr(name) {
      return this.element.getAttribute(name);
    }

    setAttr(name, value) {
      this.element.setAttribute(name, value);
      return this;
    }

    getData(name) {
      return this.element.dataset[name];
    }

    setData(name, value) {
      this.element.dataset[name] = value;
      return this;
    }

    getIndex(el) {
      if (el instanceof Element) {
        return toArray(el.parentNode.children).indexOf(el);
      } else if (el && el[__STYLES__]) {
        return toArray(el.element.parentNode.children).indexOf(el.element);
      } else {
        return toArray(this.element.parentNode.children).indexOf(this.element);
      }
    }

    hasClass(className) {
      return this.element.classList.contains(this[__STYLES__].get(className) || className);
    }

    addClass(...className) {
      for (let i = 0, name; i < className.length; i++) {
        name = this[__STYLES__].get(className[i]) || className[i];
        this.element.classList.add(name);
      }
      return this;
    }

    removeClass(...className) {
      for (let i = 0, name; i < className.length; i++) {
        name = this[__STYLES__].get(className[i]) || className[i];
        this.element.classList.remove(name);
      }
      return this;
    }

    toggleClass(...className) {
      for (let i = 0, name; i < className.length; i++) {
        name = this[__STYLES__].get(className[i]) || className[i];
        this.element.classList.toggle(name);
      }
      return this;
    }

    replaceClass(oldClass, newClass) {
      this.element.classList.replace(
        this[__STYLES__].get(oldClass) || oldClass,
        this[__STYLES__].get(newClass) || newClass
      );
      return this;
    }

    useClass(className, bool = true) {
      this.element.classList.toggle(this[__STYLES__].get(className) || className, bool);
      return this;
    }

    awaitTransition() {
      return new Promise(resolve => {
        this.element.addEventListener(transitionEventTypes.end, e => resolve(e), {once: true});
      });
    }

  }

});