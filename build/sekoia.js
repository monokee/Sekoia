(function(window) {
const TEMPLATE = document.createElement('template');

function createElement(node) {
  typeof node === 'function' && (node = node());
  TEMPLATE.innerHTML = node;
  return TEMPLATE.content.firstElementChild;
}

function deepClone(x) {

  if (!x || typeof x !== 'object') {
    return x;
  }

  if (Array.isArray(x)) {

    const y = [];

    for (let i = 0; i < x.length; i++) {
      y.push(deepClone(x[i]));
    }

    return y;

  }

  const y = {};

  for (const key in x) {
    if (x.hasOwnProperty(key)) {
      y[key] = deepClone(x[key]);
    }
  }

  return y;

}

const Core = {

  patchData(source, target, parent, key) {
    this.__systemDataDidChange = false;
    this.__deepApplyStrict(source, target, parent, key);
    return this.__systemDataDidChange;
  },

  setupComputedProperties(allProperties, computedProperties) {
    return this.__resolveDependencies(this.__installDependencies(allProperties, computedProperties));
  },

  buildDependencyGraph(computedProperties, targetMap) {

    for (const computedProperty of computedProperties.values()) {

      for(let i = 0, sourceProperty; i < computedProperty.sourceProperties.length; i++) {

        sourceProperty = computedProperty.sourceProperties[i];

        if (targetMap.has(sourceProperty)) {
          targetMap.get(sourceProperty).push(computedProperty);
        } else {
          targetMap.set(sourceProperty, [ computedProperty ]);
        }

      }

    }

    return targetMap;

  },

  // ---------------------------------------------

  __systemDataDidChange: false,
  __resolverSource: null,
  __resolverVisited: [],
  __currentlyInstallingProperties: null,
  __currentlyInstallingProperty: null,
  __dependencyProxyHandler: {

    get(target, sourceProperty) {

      const computedProperty = Core.__currentlyInstallingProperty;

      if (!target.hasOwnProperty(sourceProperty)) {
        throw {
          type: 'sekoia-internal',
          message: `Cannot resolve computed property "${computedProperty.ownPropertyName}" because dependency "${sourceProperty}" doesn't exist.`
        }
      }

      if (!computedProperty.sourceProperties.includes(sourceProperty)) {
        computedProperty.sourceProperties.push(sourceProperty);
      }

    }

  },

  __deepApplyStrict(source, target, parent, key) {

    // Assigns target data to parent[key] if target matches the type (in case of primitives) or shape (in case of objects) of source.
    // The algorithm works with arbitrarily nested data structures consisting of { plain: objects } and [ plain, arrays ].

    // Equality rules:
    // When source and target are both primitives, their type must match but their value must be different in order to be assigned.
    // When source and target are objects, the algorithm recursively applies the target object's properties to the source object's properties.
    // The target object must deeply match the source object's shape. This means that the property keys must match and the property values
    // must match type. In other words, target objects are not allowed to add or remove properties from source object (when both are plain objects)
    // and the property values of target must recursively match the shape or type of the source object's property values.
    // Any target property value that does not match it's corresponding source property value does not get assigned.
    // Mismatches do not throw errors - the algorithm will default to the source property value and continue to attempt to
    // assign any remaining target property values that match. When an actual assignment happens, the boolean returned by the
    // wrapping patchData() function is set to true and can be used by other parts of the system to determine if internal state has changed.
    // Arrays are treated similar to plain objects with an important distinction:
    // Arrays are allowed to change length. When source is an empty array, we push any items from the target array
    // into source because we have no way to compare existing items. When source is an array that has items and target is an array
    // that has more items than source, any added items must match the shape or type of the last item in the source array.
    // When the target array is shorter than or equal in length to the source array, we deepApply() each item recursively.

    // Implementation details:
    // This patching algorithm is wrapped by patchData function for change detection and has been implemented with
    // fast-path optimizations that short-circuit patch operations that are guaranteed to not change state.

    if (source === target) {
      return;
    }

    const typeSource = typeof source;
    const typeTarget = typeof target;

    // both are objects
    if (source && target && typeSource === 'object' && typeTarget === 'object') {

      if (source.constructor !== target.constructor) {
        return;
      }

      if (Array.isArray(source)) {

        if (!Array.isArray(target)) {

          return;

        } else {

          const sourceLength = source.length;

          if (sourceLength === 0) {

            if (target.length === 0) {

              return;

            } else {

              for (let i = 0; i < target.length; i++) {
                // we're pushing a value that might not be primitive
                // so we deepClone to ensure internal store data integrity.
                source.push(deepClone(target[i]));
              }

              this.__systemDataDidChange = true;

              return;

            }

          } else {

            if (target.length <= sourceLength) {

              source.length = target.length;

              for (let i = 0; i < source.length; i++) {
                this.__deepApplyStrict(source[i], target[i], source, i);
              }

            } else {

              // new array might get bigger
              // added items must match the shape and type of last item in array
              const lastSourceIndex = sourceLength - 1;
              const lastSourceItem = source[lastSourceIndex];

              for (let i = 0; i < target.length; i++) {
                if (i <= lastSourceIndex) {
                  this.__deepApplyStrict(source[i], target[i], source, i);
                } else if (this.__matches(lastSourceItem, target[i])) {
                  // we're pushing a value that might not be primitive
                  // so we deepClone to ensure internal store data integrity.
                  source.push(deepClone(target[i]));
                }
              }

            }

            if (sourceLength !== source.length) {
              this.__systemDataDidChange = true;
            }

            return;

          }

        }

      }

      // must be object
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          this.__deepApplyStrict(source[key], target[key], source, key);
        }
      }

      return;

    }

    // both are primitive but type doesn't match
    if (typeTarget !== typeSource) {
      return;
    }

    // both are primitive and of same type.
    // assign the primitive to the parent
    parent[key] = target;

    this.__systemDataDidChange = true;

  },

  __matches(source, target) {

    // This function checks whether two values match type (in case of primitives)
    // or shape (in case of objects). It uses the equality rules defined by
    // deepApplyStrict() and implements the same fast path optimizations.

    if (source === target) {
      return true;
    }

    const typeSource = typeof source;
    const typeTarget = typeof target;

    if (source && target && typeSource === 'object' && typeTarget === 'object') {

      if (source.constructor !== target.constructor) {
        return false;
      }

      if (Array.isArray(source)) {

        if (!Array.isArray(target)) {

          return false;

        } else {

          const sourceLength = source.length;

          if (sourceLength === 0) {

            return true; // both are arrays, source is empty -> match

          } else {

            if (target.length <= sourceLength) {

              // same length or shorter -> compare items directly
              for (let i = 0; i < target.length; i++) {
                if (!this.__matches(source[i], target[i])) {
                  return false;
                }
              }

            } else {

              // target is longer. added elements must match last source element
              const lastSourceIndex = sourceLength - 1;
              const lastSourceItem = source[lastSourceIndex];

              for (let i = lastSourceIndex; i < target.length; i++) {
                if (!this.__matches(lastSourceItem, target[i])) {
                  return false;
                }
              }

            }

            return true;

          }

        }

      }

      // both are objects, compare items directly
      for (const key in source) {
        if (source.hasOwnProperty(key) && !this.__matches(source[key], target[key])) {
          return false;
        }
      }

      return true;

    }

    return typeTarget === typeSource;

  },

  __installDependencies(allProperties, computedProperties) {

    // set the current installer payload
    this.__currentlyInstallingProperties = computedProperties;

    // intercept get requests to props object to grab sourceProperties
    const installer = new Proxy(allProperties, this.__dependencyProxyHandler);

    // call each computation which will trigger the intercepted get requests
    for (const computedProperty of computedProperties.values()) {

      this.__currentlyInstallingProperty = computedProperty;

      try {
        // the computation itself will most definitely fail but we only care about the property dependencies so we can safely ignore all errors.
        computedProperty.computation(installer);
      } catch(e) {
        if (e.type && e.type === 'sekoia-internal') {
          throw new Error(e.message);
        }
      }

    }

    // kill pointers
    this.__currentlyInstallingProperty = null;
    this.__currentlyInstallingProperties = null;

    return computedProperties;

  },

  __resolveDependencies(computedProperties) {

    this.__resolverSource = computedProperties;

    const target = new Map();

    for (const sourceProperty of computedProperties.keys()) {
      this.__visitDependency(sourceProperty, [], target);
    }

    this.__resolverSource = null;
    while (this.__resolverVisited.length) {
      this.__resolverVisited.pop();
    }

    return target;

  },

  __visitDependency(sourceProperty, dependencies, target) {

    if (this.__resolverSource.has(sourceProperty)) {

      dependencies.push(sourceProperty);
      this.__resolverVisited.push(sourceProperty);

      const computedProperty = this.__resolverSource.get(sourceProperty);

      for (let i = 0, name; i < computedProperty.sourceProperties.length; i++) {

        name = computedProperty.sourceProperties[i];

        if (dependencies.includes(name)) {
          throw new Error(`Circular dependency. "${computedProperty.ownPropertyName}" is required by "${name}": ${dependencies.join(' -> ')}`);
        }

        if (!this.__resolverVisited.includes(name)) {
          this.__visitDependency(name, dependencies, target);
        }

      }

      if (!target.has(sourceProperty)) {
        target.set(sourceProperty, computedProperty);
      }

    }

  }

};

function deepEqual(a, b) {

  if (a === b) {
    return true;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {

    if (a.constructor !== b.constructor) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = a.length; i-- !== 0;) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keys = Object.keys(a);
    const length = keys.length;

    if (length !== Object.keys(b).length) return false;

    for (let i = length; i-- !== 0;) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    }

    for (let i = length, key; i-- !== 0;) {
      key = keys[i];
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;

  }

  return a !== a && b !== b;

}

class ComputedProperty {

  constructor(ownPropertyName, isPrivate, computation, sourceProperties, sourceProxy) {

    this.ownPropertyName = ownPropertyName;
    this.isPrivate = isPrivate;
    this.computation = computation; // the function that computes a result from data points on the source
    
    // Dependency Graph
    this.sourceProperties = sourceProperties; // property names this computedProperty depends on
    this.sourceProxy = sourceProxy; // proxy object

    // Value Cache
    this.intermediate = void 0; // intermediate computation result
    this.value = void 0; // current computation result

    // Optimization flags
    this.needsUpdate = true; // flag indicating that one or many dependencies have updated and value needs to re-compute
    this.hasChanged = false; // flag indicating that the computation has yielded a new result (used by event-queue)

  }

  clone(sourceProxy) {
    return new this.constructor(this.ownPropertyName, this.isPrivate, this.computation, this.sourceProperties, sourceProxy);
  }

  getValue() {

    if (this.needsUpdate) { // re-compute because dependencies have updated

      // call computation with first argument = source data proxy, second argument = current value
      this.intermediate = this.computation(this.sourceProxy, this.value);

      if (!deepEqual(this.intermediate, this.value)) {

        // Computations should never produce side-effects (non-enforced convention)
        // so we don't have to do defensive cloning here. Just swap the pointer or primitive.
        this.value = this.intermediate;

        this.hasChanged = true;

      } else {

        this.hasChanged = false;

      }

      this.needsUpdate = false;

    }

    return this.value;

  }

}

class ReactiveObjectModel {

  constructor(properties) {

    this.instances = 0;
    this.nativeData = {};
    this.privateKeys = new Set();
    this.boundProperties = new Map();
    this.computedProperties = new Map();

    let isPrivate;
    for (const key in properties) {

      if (properties.hasOwnProperty(key)) {

        if (key.indexOf('_') === 0) {
          this.privateKeys.add(key);
          isPrivate = true;
        } else {
          isPrivate = false;
        }

        const value = properties[key];

        if (value?._isBinding_) {
          // It is possible to attach bindings to private, readonly computed properties.
          // It is not possible to attach bindings to non-computed private properties
          // since the private key value would leak to the bindings source object.
          if (isPrivate && !value.readonly) {
            throw new Error(`Can not bind("${value.ownPropertyName}") to private key "${key}" because it is only accessible by this object.`);
          } else {
            this.boundProperties.set(key, value);
          }
        } else if (typeof value === 'function') {
          this.computedProperties.set(key, new ComputedProperty(key, isPrivate, value, [], null));
        } else {
          this.nativeData[key] = value;
        }

      }

    }

    if (this.computedProperties.size) {
      this.computedProperties = Core.setupComputedProperties(properties, this.computedProperties);
    }

  }

}

const StateProvider = {
  setState(item) {
    this.__cache.set(++this.__uid, item);
    return this.__uid;
  },
  popState(uid) {
    uid = Number(uid);
    if (this.__cache.has(uid)) {
      const state = this.__cache.get(uid);
      this.__cache.delete(uid);
      return state;
    }
  },
  __cache: new Map(),
  __uid: -1
};

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

class ComponentModel {

  static createTag(name, attributes) {

    let tag = '<' + name;

    if (attributes) {

      for (const attribute in attributes) {

        if (attributes.hasOwnProperty(attribute)) {

          const value = attributes[attribute];

          if (typeof value === 'string') {

            tag += ' ' + attribute + '="' + value + '"';

          } else if (attribute === 'state') {

            if (value && value.$$) {
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
      if (attributes.$$) { // fast path
        element.state = attributes;
      } else {
        for (const attribute in attributes) {
          if (attributes.hasOwnProperty(attribute)) {
            const value = attributes[attribute];
            if (attribute === 'state') {
              if (value && value.$$) {
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

const REQUEST = window.requestAnimationFrame;

const Queue = {

  tick: 0,
  keyEvents: new Map(),
  wildcardEvents: new Map(),
  computedProperties: new Set(),
  dependencies: new Set(),
  resolvedComputedProperties: new Set(),

  flush() {
    if (!this.__scheduled) {
      this.__scheduled = REQUEST(this.__flushOnNextTick);
    }
  },

  throttle(fn, interval) {
    // creates a function throttled to internal flush tick
    let last = -9999999;
    return arg => {
      const now = this.tick;
      if (now - last > interval) {
        last = now;
        return fn(arg);
      }
    }
  },

  // -----------------------------------

  __scheduled: 0,
  __keyEvents: new Map(),
  __wildcardEvents: new Map(),

  __flushOnNextTick(tick) {

    this.tick = tick;

    const keyEvents = this.keyEvents;

    if (keyEvents.size) {

      // swap public buffer so events can re-populate
      // it in recursive write operations
      this.keyEvents = this.__keyEvents;
      this.__keyEvents = keyEvents;

      for (const [callback, value] of keyEvents) {
        callback(value);
        keyEvents.delete(callback);
      }

    }

    const wildcardEvents = this.wildcardEvents;

    if (wildcardEvents.size) {

      this.wildcardEvents = this.__wildcardEvents;
      this.__wildcardEvents = wildcardEvents;

      for (const [callback, owner] of wildcardEvents) {
        callback(owner);
        wildcardEvents.delete(callback);
      }

    }

    // events can re-populate these buffers because they are
    // allowed to change state in reaction to another state change.
    if (this.keyEvents.size || this.wildcardEvents.size) {
      this.__flushOnNextTick(tick); // pass same rAF tick
    } else {
      this.__scheduled = 0;
    }

  }

};

Queue.__flushOnNextTick = Queue.__flushOnNextTick.bind(Queue);

function renderList(data, config) {

  // accept arrays, convert plain objects to arrays, convert null or undefined to array
  const newArray = Array.isArray(data) ? data.slice(0) : Object.values(data || {});
  const parent = config.parentElement;

  // keep reference to old data on element
  const oldArray = parent._renderListData_ || [];
  parent._renderListData_ = newArray;

  // optimize for simple cases
  if (newArray.length === 0) {

    parent.innerHTML = '';

  } else if (oldArray.length === 0) {

    for (let i = 0; i < newArray.length; i++) {
      parent.appendChild(config.createChild(newArray[i], i, newArray));
    }

  } else {

    reconcile(parent, oldArray, newArray, config.createChild, config.updateChild);

  }

}

function reconcile(parentElement, currentArray, newArray, createFn, updateFn) {

  // dom reconciliation algorithm that compares items in currentArray to items in
  // newArray by value. implementation based on:
  // https://github.com/localvoid/ivi
  // https://github.com/adamhaile/surplus
  // https://github.com/Freak613/stage0

  let prevStart = 0, newStart = 0;
  let loop = true;
  let prevEnd = currentArray.length - 1, newEnd = newArray.length - 1;
  let a, b;
  let prevStartNode = parentElement.firstChild, newStartNode = prevStartNode;
  let prevEndNode = parentElement.lastChild, newEndNode = prevEndNode;
  let afterNode = null;

  // scan over common prefixes, suffixes, and simple reversals
  outer : while (loop) {

    loop = false;

    let _node;

    // Skip prefix
    a = currentArray[prevStart];
    b = newArray[newStart];

    while (a === b) {

      updateFn && updateFn(prevStartNode, b);

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

      updateFn && updateFn(prevEndNode, b);

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

      updateFn && updateFn(prevEndNode, b);

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

      updateFn && updateFn(prevStartNode, b);

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
          ? parentElement.insertBefore(createFn(newArray[newStart], newStart, newArray), afterNode)
          : parentElement.appendChild(createFn(newArray[newStart], newStart, newArray));
        newStart++;
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
      parentElement.appendChild(createFn(newArray[i], i, newArray));
    }

    return;

  }

  // Full Patch around longest increasing sub-sequence
  const snake = subSequence(positions, newStart);

  // gather nodes
  const nodes = [];
  let tmpC = prevStartNode;

  for (i = prevStart; i <= prevEnd; i++) {
    nodes[i] = tmpC;
    tmpC = tmpC.nextSibling;
  }

  for (i = 0; i < toRemove.length; i++) {
    parentElement.removeChild(nodes[toRemove[i]]);
  }

  let snakeIndex = snake.length - 1, tempNode;
  for (i = newEnd; i >= newStart; i--) {

    if (snake[snakeIndex] === i) {

      afterNode = nodes[positions[snake[snakeIndex]]];
      updateFn && updateFn(afterNode, newArray[i]);
      snakeIndex--;

    } else {

      if (positions[i] === -1) {
        tempNode = createFn(newArray[i], i, newArray);
      } else {
        tempNode = nodes[positions[i]];
        updateFn && updateFn(tempNode, newArray[i]);
      }

      parentElement.insertBefore(tempNode, afterNode);
      afterNode = tempNode;

    }

  }

}

function subSequence(ns, newStart) {

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

class Binding {

  // a link between reactive objects that are not in the same state branch
  constructor(sourceInternals, key, readonly) {
    this.sourceInternals = sourceInternals;
    this.ownPropertyName = key;
    this.readonly = readonly; // true when bound to upstream computed property
    this.connectedObjectInternals = new Map(); // [reactiveObjectInternals -> key]
  }

  connect(reactiveObjectInternals, boundKey) {

    if (reactiveObjectInternals === this.sourceInternals) {
      throw new Error(`Failed to bind "${boundKey}". Cannot bind object to itself.`);
    } else if (this.connectedObjectInternals.has(reactiveObjectInternals)) {
      throw new Error(`Failed to bind "${boundKey}". Cannot bind to an object more than once.`);
    } else {
      this.connectedObjectInternals.set(reactiveObjectInternals, boundKey);
    }

  }

  observeSource(callback, cancelable, silent) {
    return this.sourceInternals.observe(this.ownPropertyName, callback, cancelable, silent);
  }

  getValue(writableOnly) {
    return this.sourceInternals.getDatum(this.ownPropertyName, writableOnly);
  }

  getDefaultValue() {
    return this.sourceInternals.getDefaultDatum(this.ownPropertyName);
  }

  setValue(value, silent) {
    this.sourceInternals.setDatum(this.ownPropertyName, value, silent);
  }

}

Binding.prototype._isBinding_ = true;

class ReactiveObjectInternals {

  constructor(model) {

    // clone from the second instance on
    const cloneChildren = ++model.instances > 1;

    this.model = model;
    this.privateKeys = model.privateKeys;
    this.boundProperties = model.boundProperties;
    this.modelNativeData = model.nativeData;

    this.nativeData = {};
    this.allProperties = {};
    this.settableProperties = {};
    this.bindings = new Map();
    this.events = new Map();
    this.computedProperties = new Map();
    this.dependencyGraph = new Map();

    this.parentInternals = null;
    this.ownPropertyName = '';

    for (const key in this.modelNativeData) {

      if (this.modelNativeData.hasOwnProperty(key)) {

        const value = this.modelNativeData[key];

        if (value && value.$$) {

          if (cloneChildren) {
            this.nativeData[key] = value.$$.owner.clone();
          } else {
            this.nativeData[key] = value;
          }

          this.nativeData[key].$$.parentInternals = this;
          this.nativeData[key].$$.ownPropertyName = key;

        } else {

          this.nativeData[key] = deepClone(value);

        }

      }

    }

    // register internals on the binding so that when
    // nativeData changes in the implementing object, this one gets notified
    for (const [key, binding] of model.boundProperties) {
      binding.connect(this, key);
    }

    if (model.computedProperties.size) {

      // install a single data proxy into all computations.
      const proxy = new Proxy(this.allProperties, {
        get: (target, key) => this.getDatum(key, false)
      });

      for (const [key, computedProperty] of model.computedProperties) {
        this.computedProperties.set(key, computedProperty.clone(proxy));
      }

      Core.buildDependencyGraph(this.computedProperties, this.dependencyGraph);

    }

  }

  getDefaultDatum(key) {

    if (this.modelNativeData.hasOwnProperty(key)) {

      const value = this.modelNativeData[key];

      if (value?.$$) {
        return value.$$.getDefaultData();
      } else {
        return value;
      }

    } else if (this.boundProperties.has(key)) {

      return this.boundProperties.get(key).getDefaultValue();

    }

  }

  getDefaultData() {

    let key, val;

    for ([key, val] of this.boundProperties) {
      if (!val.readonly) { // skip bindings that resolve to computed properties
        this.settableProperties[key] = val.getDefaultValue();
      }
    }

    for (key in this.modelNativeData) {
      if (this.modelNativeData.hasOwnProperty(key)) {
        val = this.modelNativeData[key];
        if (val?.$$) {
          this.settableProperties[key] = val.$$.getDefaultData();
        } else {
          this.settableProperties[key] = val;
        }
      }
    }

    return this.settableProperties;

  }

  getDatum(key, writableOnly) {

    if (this.nativeData.hasOwnProperty(key)) {

      const value = this.nativeData[key];

      if (writableOnly) {
        if (value?.$$) {
          return value.$$.getData(writableOnly);
        } else if (!this.privateKeys.has(key)) {
          return value;
        }
      } else {
        return value;
      }

    } else if (this.boundProperties.has(key)) {

      return this.boundProperties.get(key).getValue(writableOnly);

    } else if (!writableOnly && this.computedProperties.has(key)) {

      return this.computedProperties.get(key).getValue();

    }

  }

  getData(writableOnly) {

    const wrapper = {};

    let key, val;

    for (key in this.nativeData) {
      if (this.nativeData.hasOwnProperty(key)) {
        val = this.nativeData[key];
        if (writableOnly) {
          if (val?.$$) {
            wrapper[key] = val.$$.getData(writableOnly);
          } else if (!this.privateKeys.has(key)) {
            wrapper[key] = val;
          }
        } else {
          wrapper[key] = val;
        }
      }
    }

    for ([key, val] of this.boundProperties) {
      if (writableOnly && !val.readonly) {
        wrapper[key] = val.getValue(writableOnly);
      }
    }

    if (!writableOnly) {
      for (const [key, val] of this.computedProperties) {
        wrapper[key] = val.getValue();
      }
    }

    return wrapper;

  }

  setDatum(key, value, silent) {

    if (this.nativeData.hasOwnProperty(key)) {

      if (this.nativeData[key]?.$$) {

        this.nativeData[key].$$.setData(value, silent);

      } else if (Core.patchData(this.nativeData[key], value, this.nativeData, key) && !silent) {

        this.resolve(key, value);

      }

    } else if (this.boundProperties.has(key)) {

      this.boundProperties.get(key).setValue(value, silent);

    }

  }

  setData(data, silent) {
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        this.setDatum(key, data[key], silent);
      }
    }
  }

  observe(key, callback, unobservable, silent) {

    if (this.boundProperties.has(key)) {

      // forward the subscription to the bound object
      return this.boundProperties.get(key).observeSource(callback, unobservable, silent);

    } else if (this.nativeData[key]?.$$) {

      // use wildcard listener on child object
      return this.nativeData[key].$$.observe('*', callback, unobservable, silent);

    } else {

      // (0) Install Observer so it can run in the future whenever observed key changes

      const callbacks = this.events.get(key);

      if (callbacks) {
        callbacks.push(callback);
      } else {
        this.events.set(key, [ callback ]);
      }

      // (1) Schedule an immediate observation
      if (!silent) {

        if (key === '*') {

          Queue.wildcardEvents.set(callback, this.owner);

        } else {

          const computedProperty = this.computedProperties.get(key);

          if (computedProperty) {
            Queue.keyEvents.set(callback, computedProperty.getValue());
          } else {
            Queue.keyEvents.set(callback, this.nativeData[key]);
          }

        }

        Queue.flush();

      }

      // (2) Return unobserve function if required
      if (unobservable) {
        return () => {
          const callbacks = this.events.get(key);
          if (callbacks && callbacks.includes(callback)) {
            callbacks.splice(callbacks.indexOf(callback), 1);
          }
        }
      }

    }

  }

  bind(key) {

    // returns a Binding that can be implemented as a property value on other objects.
    // the Binding forwards all read/write operations to this object which is the single
    // source of truth. Binding is two-way unless it is readonly (computed).

    // internal.bindings: key bindings that are bound to other objects that get/set nativeData in this object.
    // when a bound property in another object changes, the actual data changes here.
    // when the data changes here, all bound objects are notified.
    //
    // internal.boundProperties: key bindings that are bound to this object that get/set nativeData in another object.
    // when data changes here, the actual data changes in the other object.
    // when data changes in the other object, this object and it's bound cousins are notified.

    if (this.boundProperties.has(key)) {
      throw new Error(`Cannot bind("${key}") because that property is already bound itself. Instead of chaining, bind directly to the source.`);
    } else if (this.privateKeys.has(key)) {
      throw new Error(`Cannot bind("${key}") because it is private and only available to the source object internally.`);
    }

    if (!this.bindings.has(key)) {
      const readonly = this.computedProperties.has(key);
      this.bindings.set(key, new Binding(this, key, readonly));
    }

    return this.bindings.get(key);

  }

  resolve(key, value) {

    let onlyPrivateKeysChanged = this.privateKeys.has(key);

    const OWN_DEPENDENCY_GRAPH = this.dependencyGraph;
    const OWN_EVENTS = this.events;

    const QUEUE_KEY_EVENTS = Queue.keyEvents;

    // (0) ---------- RESOLVE COMPUTED DEPENDENCIES

    const KEY_DEPENDENCIES = OWN_DEPENDENCY_GRAPH.get(key);

    if (KEY_DEPENDENCIES) {

      const QUEUE_COMPUTATIONS = Queue.computedProperties;
      const QUEUE_RESOLVED = Queue.resolvedComputedProperties;
      const QUEUE_DEPENDENCIES = Queue.dependencies;

      // queue up unique computed properties that immediately depend on changed key
      for (let i = 0; i < KEY_DEPENDENCIES.length; i++) {
        QUEUE_COMPUTATIONS.add(KEY_DEPENDENCIES[i]);
      }

      while (QUEUE_COMPUTATIONS.size) {

        for (const computedProperty of QUEUE_COMPUTATIONS) {

          if (!QUEUE_RESOLVED.has(computedProperty)) {

            // force re-computation because dependency has updated
            computedProperty.needsUpdate = true;

            const result = computedProperty.getValue();

            if (computedProperty.hasChanged === true) {

              // Queue KEY events of computed property
              const keyEvents = OWN_EVENTS.get(computedProperty.ownPropertyName);
              if (keyEvents) {
                for (let i = 0; i < keyEvents.length; i++) {
                  QUEUE_KEY_EVENTS.set(keyEvents[i], result);
                }
              }

              // flag wildcards to queue if computed property is not private
              if (!computedProperty.isPrivate) {
                onlyPrivateKeysChanged = false;
              }

              // add this computed property as a DEPENDENCY
              QUEUE_DEPENDENCIES.add(computedProperty);

            }

            QUEUE_RESOLVED.add(computedProperty);

          }

          // empty initial queue
          QUEUE_COMPUTATIONS.delete(computedProperty);

        }

        // add any unresolved dependencies back into the queue
        for (const computedProperty of QUEUE_DEPENDENCIES) {

          const dependencies = OWN_DEPENDENCY_GRAPH.get(computedProperty.ownPropertyName);

          if (dependencies) {
            for (let i = 0; i < dependencies.length; i++) {
              // add this dependency back onto the queue so that
              // the outer while loop can continue to resolve
              QUEUE_COMPUTATIONS.add(dependencies[i]);
            }
          }

          // empty dependency queue
          QUEUE_DEPENDENCIES.delete(computedProperty);

        }

      }

      // Clear the resolved queue
      QUEUE_RESOLVED.clear();

    }

    // (1) ------------ QUEUE EVENTS

    // ...queue key events
    const KEY_EVENTS = OWN_EVENTS.get(key);
    if (KEY_EVENTS) {
      for (let i = 0; i < KEY_EVENTS.length; i++) {
        QUEUE_KEY_EVENTS.set(KEY_EVENTS[i], value);
      }
    }

    // when public properties where affected...
    if (!onlyPrivateKeysChanged) {

      // ...queue wildcard events
      const WILDCARD_EVENTS = OWN_EVENTS.get('*');
      if (WILDCARD_EVENTS) {
        const QUEUE_WILDCARDS = Queue.wildcardEvents;
        for (let i = 0; i < WILDCARD_EVENTS.length; i++) {
          QUEUE_WILDCARDS.set(WILDCARD_EVENTS[i], this.owner);
        }
      }

      // ...resolve connected objects
      const KEY_BINDING = this.bindings.get(key);
      if (KEY_BINDING) {
        for (const [connectedObjectInternals, boundKey] of KEY_BINDING.connectedObjectInternals) {
          connectedObjectInternals.resolve(boundKey, value);
        }
      }

      // ...resolve parent
      if (this.parentInternals) {
        this.parentInternals.resolve(this.ownPropertyName, this.owner);
      }

    }

    Queue.flush();

  }

}

class ReactiveWrapper {

  constructor(internal) {
    Object.defineProperty(this, '$$', {
      value: internal
    });
  }

  get(key) {
    if (key === void 0) {
      return this.$$.getData(false);
    } else {
      return this.$$.getDatum(key, false);
    }
  }

  default(key) {
    // return deep clone of writable default values
    if (key === void 0) {
      return deepClone(this.$$.getDefaultData());
    } else {
      return deepClone(this.$$.getDefaultDatum(key));
    }
  }

  snapshot(key) {

    // return a deep clone of writable data
    if (key === void 0) {

      // getData(true) already returns a shallow copy...
      const copy = this.$$.getData(true);

      // ...make it deep
      if (Array.isArray(copy)) {
        for (let i = 0; i < copy.length; i++) {
          copy[i] = deepClone(copy[i]);
        }
      } else {
        for (const key in copy) {
          if (copy.hasOwnProperty(key)) {
            copy[key] = deepClone(copy[key]);
          }
        }
      }

      return copy;

    } else {

      return deepClone(this.$$.getDatum(key, true));

    }

  }

  set(key, value) {
    if (typeof key === 'object') {
      this.$$.setData(key);
    } else {
      this.$$.setDatum(key, value);
    }
  }

  reset(key) {
    if (key === void 0) {
      this.set(this.default());
    } else {
      this.set(key, this.default(key));
    }
  }

}

class StateTracker {

  constructor(onTrack, maxEntries = 100) {
    this.__stack = [];
    this.__index = 0;
    this.__recursive = false;
    this.__max = maxEntries;
    this.__onTrack = onTrack;
  }

  prev() {
    return this.__index - 1;
  }

  next() {
    return this.__index + 1;
  }

  has(index) {
    if (index < 0 || !this.__stack.length) {
      return false;
    } else {
      return index <= this.__stack.length - 1;
    }
  }

  get(index) {

    if (index !== this.__index) {

      this.__recursive = true;
      this.__index = index;

      if (this.__onTrack) {
        // callback value, index, length
        this.__onTrack(this.__stack[index], index, this.__stack.length);
      }

    }

    return this.__stack[index];

  }

  add(state, checkUniqueness) {

    if (this.__recursive) {

      this.__recursive = false;

    } else {

      state = state?.$$ ? state.snapshot() : state;

      if (checkUniqueness && deepEqual(state, this.__stack[this.__index])) {

        return false;

      } else {

        // history modification: remove everything after this point
        if (this.__index + 1 < this.__stack.length) {
          this.__stack.splice(this.__index + 1, this.__stack.length - this.__index - 1);
        }

        // maxed out: remove items from beginning
        if (this.__stack.length === this.__max) {
          this.__stack.shift();
        }

        // append and move marker to last position
        this.__stack.push(state);
        this.__index = this.__stack.length - 1;

        if (this.__onTrack) {
          this.__onTrack(this.__stack[this.__index], this.__index, this.__stack.length);
        }

        return true;

      }

    }

  }

}

function defer(callback, timeout = 100) {
  let pending = 0;
  return arg => {
    clearTimeout(pending);
    pending = setTimeout(callback, timeout, arg);
  }
}

class ReactiveObject extends ReactiveWrapper {

  static _from_(model, data) {

    const clone = Object.create(ReactiveObject.prototype);
    clone.$$ = new ReactiveObjectInternals(model);
    clone.$$.owner = clone;

    if (data) {
      clone.$$.setData(data, true);
    }

    return clone;

  }

  constructor(properties) {
    const model = new ReactiveObjectModel(properties);
    const internals = new ReactiveObjectInternals(model);
    super(internals);
    internals.owner = this;
  }

  clone(data) {
    return this.constructor._from_(this.$$.model, data);
  }

  observe(key, callback, options = {}) {

    if (typeof key === 'object') {

      // { ...key: callback } -> convenient but non cancelable, non silent
      for (const k in key) {
        if (key.hasOwnProperty(k)) {
          this.$$.observe(k, key[k], false, false);
        }
      }

    } else {

      if ((options.throttle || 0) > 0) {

        return this.$$.observe(key, Queue.throttle(callback, options.throttle), options.cancelable, options.silent);

      } else if ((options.defer || 0) > 0) {

        return this.$$.observe(key, defer(callback, options.defer), options.cancelable, options.silent);

      } else {

        return this.$$.observe(key, callback, options.cancelable, options.silent);

      }

    }

  }

  bind(key) {
    return this.$$.bind(key);
  }

  track(key, options = {}) {

    key || (key = '*');

    const stateTrackers = this.$$.stateTrackers || (this.$$.stateTrackers = new Map());

    if (stateTrackers.has(key)) {
      throw new Error(`Cannot track state of "${key}" because the property is already being tracked.`);
    } else if (this.$$.computedProperties.has(key)) {
      throw new Error(`Cannot track computed property "${key}". Only track writable properties.`);
    }

    const tracker = new StateTracker(options.onTrack, options.maxEntries);
    stateTrackers.set(key, tracker);

    // when tracking is throttled or deferred we have to check if the latest value
    // is different than the last value that was added to the tracker. this is because
    // state change detection is synchronous but when throttling or deferring, we might
    // trigger intermediate state changes but finally land on the initial state. By
    // setting a flag at install time we can avoid this check for all synchronous trackers.
    const checkUniqueness = (options.throttle || 0) > 0 || (options.defer || 0) > 0;

    // observer immediately tracks initial state
    return this.observe(key, val => tracker.add(val, checkUniqueness), options);

  }

  undo(key) {
    key || (key = '*');
    this.restore(key, this.$$.stateTrackers?.get(key)?.prev());
  }

  redo(key) {
    key || (key = '*');
    this.restore(key, this.$$.stateTrackers?.get(key)?.next());
  }

  restore(key, trackPosition) {

    if (trackPosition === void 0 && typeof key === 'number') {
      trackPosition = key;
      key = '*';
    }

    const tracker = this.$$.stateTrackers?.get(key);

    if (tracker && tracker.has(trackPosition)) {
      if (key === '*') {
        this.$$.setData(tracker.get(trackPosition), false);
      } else {
        this.$$.setDatum(key, tracker.get(trackPosition), false);
      }
    }

  }

}

class ComponentElement extends HTMLElement {

  constructor(model) {

    super();

    Object.defineProperties(this, {
      _initialized_: {
        value: false,
        writable: true
      },
      _model_: {
        value: model
      }
    });

  }

  connectedCallback() {

    if (this._initialized_ === false) {

      this._initialized_ = true;

      const MODEL = this._model_;

      const REFS = new Proxy({$self: this}, {
        get: (target, key) => {
          return target[key] || (target[key] = this.getElementsByClassName(MODEL.refs.get(key))[0]);
        }
      });

      // compile template
      MODEL.compileTemplateOnce();

      // create inner component markup
      this.appendChild(MODEL.content.cloneNode(true));

      if (MODEL.setupStateOnce()) {

        if (this.hasAttribute('provided-state')) {

          this.state = StateProvider.popState(this.getAttribute('provided-state'));
          this.removeAttribute('provided-state');

        } else {

          this.state = this.state || ReactiveObject._from_(MODEL.state);

          if (this.hasAttribute('composed-state-data')) {
            this.state.$$.setData(StateProvider.popState(this.getAttribute('composed-state-data')), false);
            this.removeAttribute('composed-state-data');
          }

        }

        // Register render callbacks
        for (const [key, callback] of MODEL.renderEvents) {
          // simple granular render functions: render({...$ref}, currentValue)
          this.state.$$.observe(key, value => callback(REFS, value));
        }

        // Create automatic list renderings
        for (const [key, config] of MODEL.renderListConfigs) {

          const cfg = {
            parentElement: REFS[config.parentElement],
            createChild: config.createChild,
            updateChild: config.updateChild
          };

          const reactiveArray = this.state.$$.getDatum(key);
          reactiveArray.$$.setStructuralObserver(value => {
            renderList(value.$$.nativeData, cfg);
          });

        }

      }

      if (MODEL.initialize) {
        // schedule as wildcard handler so that init is called after everything else
        Queue.wildcardEvents.set(MODEL.initialize.bind(this), REFS);
      }

    }

  }

}

function defineComponent(name, config) {

  const model = new ComponentModel(name, config);

  const component = class extends ComponentElement {
    constructor() {
      super(model);
    }
  };

  // add custom methods to prototype
  for (const key in config) {
    if (config.hasOwnProperty(key) && key !== 'initialize' && typeof config[key] === 'function') {
      component.prototype[key] = config[key];
    }
  }

  window.customElements.define(name, component);

  // creates composable html tag with attributes
  const Factory = attributes => ComponentModel.createTag(name, attributes);

  // creates a new state object
  Factory.state = data => {
    if (model.setupStateOnce()) {
      return ReactiveObject._from_(model.state, data);
    } else {
      return data;
    }
  };

  // creates dom node
  Factory.render = attributes => ComponentModel.createNode(name, attributes, Factory.state);

  return Factory;

}

let RESIZE_OBSERVER, HANDLERS, RESIZE_BUFFER;

function onResize(element, handler) {

  if (element === window || element === document || element === document.documentElement) {
    element = document.body;
  }

  if ((HANDLERS || (HANDLERS = new Map())).has(element)) {
    HANDLERS.get(element).push(handler);
  } else {
    HANDLERS.set(element, [handler]);
  }

  (RESIZE_OBSERVER || (RESIZE_OBSERVER = new ResizeObserver(entries => {
    clearTimeout(RESIZE_BUFFER);
    RESIZE_BUFFER = setTimeout(ON_RESIZE, 100, entries);
  }))).observe(element);

}

function ON_RESIZE(entries) {
  for (let i = 0, entry, handlers; i < entries.length; i++) {
    entry = entries[i];
    handlers = HANDLERS.get(entry.target);
    if (handlers) {
      for (let k = 0; k < handlers.length; k++) {
        handlers[k](entry);
      }
    }
  }
}

const LOCATION = window.location;
const HISTORY = window.history;
const ORIGIN = LOCATION.origin + LOCATION.pathname;

const ABSOLUTE_ORIGIN_NAMES = [ORIGIN, LOCATION.hostname, LOCATION.hostname + '/', LOCATION.origin];
if (ORIGIN[ORIGIN.length - 1] !== '/') {
  ABSOLUTE_ORIGIN_NAMES.push(ORIGIN + '/');
}
if (LOCATION.pathname && LOCATION.pathname !== '/') {
  ABSOLUTE_ORIGIN_NAMES.push(LOCATION.pathname);
}

const ALLOWED_ORIGIN_NAMES = ['/', '#', '/#', '/#/', ...ABSOLUTE_ORIGIN_NAMES];
const ORIGIN_URL = new URL(ORIGIN);
const CLEAN_ORIGIN = removeTrailingSlash(ORIGIN);

const REGISTERED_FILTERS = new Map();
const REGISTERED_ACTIONS = new Set();

const WILDCARD_ACTIONS = [];
let WILDCARD_FILTER = null;

const ROUTES_STRUCT = {};

const DEFAULT_TRIGGER_OPTIONS = {
  params: {},
  keepQuery: true,
  forceReload: false,
  history: 'pushState'
};

let HAS_POPSTATE_LISTENER = false;
let CURRENT_QUERY_PARAMETERS = buildParamsFromQueryString(LOCATION.search);
let CURRENT_ROUTE_FRAGMENTS = ['/'];
if (LOCATION.hash) {
  CURRENT_ROUTE_FRAGMENTS.push(...LOCATION.hash.split('/'));
}

const Router = {

  before(route, filter) {

    addPopStateListenerOnce();

    if (route === '*') {

      if (WILDCARD_FILTER !== null) {
        console.warn('Router.before(*, filter) - overwriting previously registered wildcard filter (*)');
      }

      WILDCARD_FILTER = filter;

    } else {

      const { hash } = getRouteParts(route);

      if (REGISTERED_FILTERS.has(hash)) {
        throw new Error(`Router.beforeRoute() already has a filter for ${hash === '#' ? `${route} (root url)` : route}`);
      }

      REGISTERED_FILTERS.set(hash, filter);

    }

  },

  on(route, action) {

    addPopStateListenerOnce();

    if (route === '*') {

      if (WILDCARD_ACTIONS.indexOf(action) === -1) {
        WILDCARD_ACTIONS.push(action);
      }

    } else {

      const { hash } = getRouteParts(route);

      if (REGISTERED_ACTIONS.has(hash)) {
        throw new Error('Router.onRoute() already has a action for "' + hash === '#' ? (route + ' (root url)') : route + '".');
      }

      REGISTERED_ACTIONS.add(hash);

      assignActionToRouteStruct(hash, action);

    }

  },

  hasFilter(route) {
    if (route === '*') {
      return WILDCARD_FILTER !== null;
    } else {
      const { hash } = getRouteParts(route);
      return REGISTERED_FILTERS.has(hash);
    }
  },

  hasAction(route) {
    if (route === '*') {
      return WILDCARD_ACTIONS.length > 0;
    } else {
      const { hash } = getRouteParts(route);
      return REGISTERED_ACTIONS.has(hash);
    }
  },

  navigate(route, options = {}) {

    if (route.lastIndexOf('http', 0) === 0 && route !== LOCATION.href) {
      return LOCATION.href = route;
    }

    const { hash, query, rel } = getRouteParts(route);

    options = Object.assign({}, DEFAULT_TRIGGER_OPTIONS, options);

    if (options.keepQuery === true) {
      Object.assign(CURRENT_QUERY_PARAMETERS, buildParamsFromQueryString(query));
    } else {
      CURRENT_QUERY_PARAMETERS = buildParamsFromQueryString(query);
    }

    // Filters
    if (WILDCARD_FILTER) { // 1.0 - Apply wildcard filter

      WILDCARD_FILTER(rel, CURRENT_QUERY_PARAMETERS, response => {

        if (response !== rel) {

          reRoute(response);

        } else {

          if (REGISTERED_FILTERS.has(hash)) { // 1.1 - Apply route filters

            REGISTERED_FILTERS.get(hash)(rel, CURRENT_QUERY_PARAMETERS, response => {

              if (response !== rel) {

                reRoute(response);

              } else {

                performNavigation(hash, query, options.keepQuery, options.history);

              }

            });

          } else {

            performNavigation(hash, query, options.keepQuery, options.history);

          }

        }

      });

    } else if (REGISTERED_FILTERS.has(hash)) { // 2.0 - Apply route filters

      REGISTERED_FILTERS.get(hash)(rel, CURRENT_QUERY_PARAMETERS, response => {

        if (response !== rel) {

          reRoute(response);

        } else {

          performNavigation(hash, query, options.keepQuery, options.history);

        }

      });

    } else {

      performNavigation(hash, query, options.keepQuery, options.history);

    }

  },

  resolve(options = {}) {
    // should be called once after all filters and actions have been registered
    this.navigate(LOCATION.href, options);
  },

  getQueryParameters(key) {
    if (!key) {
      return Object.assign({}, CURRENT_QUERY_PARAMETERS);
    } else {
      return CURRENT_QUERY_PARAMETERS[key];
    }
  },

  addQueryParameters(key, value) {

    if (typeof key === 'object') {
      for (const k in key) {
        if (key.hasOwnProperty(k)) {
          CURRENT_QUERY_PARAMETERS[k] = key[k];
        }
      }
    } else {
      CURRENT_QUERY_PARAMETERS[key] = value;
    }

    updateQueryString();

  },

  setQueryParameters(params) {
    CURRENT_QUERY_PARAMETERS = deepClone(params);
    updateQueryString();
  },

  removeQueryParameters(key) {

    if (!key) {
      CURRENT_QUERY_PARAMETERS = {};
    } else if (Array.isArray(key)) {
      key.forEach(k => {
        if (CURRENT_QUERY_PARAMETERS[k]) {
          delete CURRENT_QUERY_PARAMETERS[k];
        }
      });
    } else if (CURRENT_QUERY_PARAMETERS[key]) {
      delete CURRENT_QUERY_PARAMETERS[key];
    }

    updateQueryString();

  }

};

function addPopStateListenerOnce() {

  if (!HAS_POPSTATE_LISTENER) {

    HAS_POPSTATE_LISTENER = true;

    // never fired on initial page load in all up-to-date browsers
    window.addEventListener('popstate', () => {
      Router.navigate(LOCATION.href, {
        history: 'replaceState',
        forceReload: false
      });
    });

  }

}

function performNavigation(hash, query, keepQuery, historyMode) {

  executeWildCardActions(hash);
  executeRouteActions(hash);

  ORIGIN_URL.hash = hash;
  ORIGIN_URL.search = keepQuery ? buildQueryStringFromParams(CURRENT_QUERY_PARAMETERS) : query;
  HISTORY[historyMode](null, document.title, ORIGIN_URL.toString());

}

function updateQueryString() {
  ORIGIN_URL.search = buildQueryStringFromParams(CURRENT_QUERY_PARAMETERS);
  HISTORY.replaceState(null, document.title, ORIGIN_URL.toString());
}

function reRoute(newRoute) {
  if (newRoute.lastIndexOf('http', 0) === 0) {
    return LOCATION.href = newRoute;
  } else {
    return Router.navigate(newRoute, {
      history: 'replaceState',
      forceReload: false
    });
  }
}

function executeWildCardActions(hash) {

  hash = hash === '#' ? '' : hash;
  const completePath =  CLEAN_ORIGIN + hash;

  for (let i = 0; i < WILDCARD_ACTIONS.length; i++) {
    WILDCARD_ACTIONS[i](completePath, CURRENT_QUERY_PARAMETERS);
  }

}

function executeRouteActions(hash) {

  const routeFragments = ['/'];

  if (hash !== '#') {
    routeFragments.push(...hash.split('/'));
  }

  // find the intersection between the last route and the next route
  const intersection = getArrayIntersection(CURRENT_ROUTE_FRAGMENTS, routeFragments);

  // recompute the last intersecting fragment + any tail that might have been added
  const fragmentsToRecompute = [intersection[intersection.length - 1]];

  if (routeFragments.length > intersection.length) {
    fragmentsToRecompute.push(...getArrayTail(intersection, routeFragments));
  }

  // find the first node that needs to be recomputed
  let currentRouteNode = ROUTES_STRUCT;
  let fragment;

  for (let i = 0; i < intersection.length; i ++) {

    fragment = intersection[i];

    if (fragment === fragmentsToRecompute[0]) { // detect overlap
      fragment = fragmentsToRecompute.shift(); // remove first element (only there for overlap detection)
      break;
    } else {
      currentRouteNode = currentRouteNode[fragment].children;
    }

  }

  // execute actions
  while (currentRouteNode[fragment] && fragmentsToRecompute.length) {

    // call action with joined remaining fragments as "path" argument
    if (currentRouteNode[fragment].action) {
      currentRouteNode[fragment].action(fragmentsToRecompute.join('/'), CURRENT_QUERY_PARAMETERS);
    }

    currentRouteNode = currentRouteNode[fragment].children;
    fragment = fragmentsToRecompute.shift();

  }

  // execute last action with single trailing slash as "path" argument
  if (currentRouteNode[fragment] && currentRouteNode[fragment].action) {
    currentRouteNode[fragment].action('/', CURRENT_QUERY_PARAMETERS);
  }

  // update current route fragments
  CURRENT_ROUTE_FRAGMENTS = routeFragments;

}

function assignActionToRouteStruct(hash, action) {

  // create root struct if it doesnt exist
  const structOrigin = ROUTES_STRUCT['/'] || (ROUTES_STRUCT['/'] = {
    action: void 0,
    children: {}
  });

  // register the route structurally so that its callbacks can be resolved in order of change
  if (hash === '#') { // is root

    structOrigin.action = action;

  } else {

    const hashParts = hash.split('/');
    const leafPart = hashParts[hashParts.length - 1];

    hashParts.reduce((branch, part) => {

      if (branch[part]) {

        if (part === leafPart) {
          branch[part].action = action;
        }

        return branch[part].children;

      } else {

        return (branch[part] = {
          action: part === leafPart ? action : void 0,
          children: {}
        }).children;

      }

    }, structOrigin.children);

  }

}

function getRouteParts(route) {

  if (ALLOWED_ORIGIN_NAMES.indexOf(route) > -1) {
    return {
      rel: '/',
      abs: ORIGIN,
      hash: '#',
      query: ''
    }
  }

  if (route[0] === '?' || route[0] === '#') {
    const {hash, query} = getHashAndQuery(route);
    return {
      rel: convertHashToRelativePath(hash),
      abs: ORIGIN + hash,
      hash: hash || '#',
      query: query
    }
  }

  route = removeAllowedOriginPrefix(route);

  if (route [0] !== '?' && route[0] !== '#') {
    throw new Error('Invalid Route: "' + route + '". Non-root paths must start with ? query or # hash.');
  }

  const {hash, query} = getHashAndQuery(route);

  return {
    rel: convertHashToRelativePath(hash),
    abs: ORIGIN + hash,
    hash: hash || '#',
    query: query
  }

}

function getHashAndQuery(route) {

  const indexOfHash = route.indexOf('#');
  const indexOfQuestion = route.indexOf('?');

  if (indexOfHash === -1) { // url has no hash
    return {
      hash: '',
      query: removeTrailingSlash(new URL(route, ORIGIN).search)
    }
  }

  if (indexOfQuestion === -1) { // url has no query
    return {
      hash: removeTrailingSlash(new URL(route, ORIGIN).hash),
      query: ''
    }
  }

  const url = new URL(route, ORIGIN);

  if (indexOfQuestion < indexOfHash) { // standard compliant url with query before hash
    return {
      hash: removeTrailingSlash(url.hash),
      query: removeTrailingSlash(url.search)
    }
  }

  // non-standard url with hash before query (query is inside the hash)
  let hash = url.hash;
  const query = hash.slice(hash.indexOf('?'));
  hash = hash.replace(query, '');

  return {
    hash: removeTrailingSlash(hash),
    query: removeTrailingSlash(query)
  }

}

function convertHashToRelativePath(hash) {
  return (hash === '#' ? '/' : hash) || '/';
}

function removeTrailingSlash(str) {
  return str[str.length - 1] === '/' ? str.substring(0, str.length - 1) : str;
}

function removeAllowedOriginPrefix(route) {
  const lop = getLongestOccurringPrefix(route, ALLOWED_ORIGIN_NAMES);
  const hashPart = lop ? route.substr(lop.length) : route;
  return hashPart.lastIndexOf('/', 0) === 0 ? hashPart.substr(1) : hashPart;
}

function getLongestOccurringPrefix(s, prefixes) {
  return prefixes
    .filter(x => s.lastIndexOf(x, 0) === 0)
    .sort((a, b) => b.length - a.length)[0];
}

function getArrayIntersection(a, b) {

  const intersection = [];

  for (let x = 0; x < a.length; x++) {
    for (let y = 0; y < b.length; y++) {
      if (a[x] === b[y]) {
        intersection.push(a[x]);
        break;
      }
    }
  }

  return intersection;

}

function getArrayTail(a, b) {

  const tail = [];

  for (let i = a.length; i < b.length; i++) {
    tail.push(b[i]);
  }

  return tail;

}

function buildParamsFromQueryString(queryString) {

  const params = {};

  if (queryString.length > 1) {
    const queries = queryString.substring(1).replace(/\+/g, ' ').replace(/;/g, '&').split('&');
    for (let i = 0, kv, key; i < queries.length; i++) {
      kv = queries[i].split('=', 2);
      key = decodeURIComponent(kv[0]);
      if (key) {
        params[key] = kv.length > 1 ? decodeURIComponent(kv[1]) : true;
      }
    }
  }

  return params;

}

function buildQueryStringFromParams(params) {

  let querystring = '?';

  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      querystring += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]) + '&';
    }
  }

  if (querystring === '?') {
    querystring = '';
  } else if (querystring[querystring.length - 1] === '&') {
    querystring = querystring.substring(0, querystring.length - 1);
  }

  return querystring;

}

const PENDING_CALLS = new Map();

const ON_REQUEST_START = new Set();
const ON_REQUEST_STOP = new Set();

function makeCall(url, method, token, data = {}) {

  if (PENDING_CALLS.has(url)) {

    return PENDING_CALLS.get(url);

  } else {

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fire(ON_REQUEST_START, url);

    return PENDING_CALLS.set(url, fetch(url, {
      method: method,
      mode: 'cors',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: headers,
      redirect: 'follow',
      referrer: 'no-referrer',
      body: method === 'GET' ? null : typeof data === 'string' ? data : JSON.stringify(data)
    }).then(res => {
      const ct = res.headers.get('content-type');
      const fn = ct && ct.includes('application/json') ? 'json' : 'text';
      if (!res.ok) {
        return res[fn]().then(x => {
          throw x;
        });
      } else {
        if (res.status === 204) {
          return {};
        } else {
          return res[fn]();
        }
      }
    }).finally(() => {
      PENDING_CALLS.delete(url);
      fire(ON_REQUEST_STOP, url);
    })).get(url);

  }

}

function fire(events, url) {
  for (const event of events) {
    if (event.includes === '*' || url.includes(event.includes)) {
      event.handler();
    }
  }
}

function deleteRequest(url, data, token) {
  return makeCall(url, 'DELETE', token, data);
}

function hashString(str) {
  if (!str.length) return '0';
  let hash = 0;
  for (let i = 0, char; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash + '';
}

// In-Memory Fallback that mocks required IndexedDB patterns
class AsyncMemoryRequest {

  constructor(result) {
    requestAnimationFrame(() => {
      this.onsuccess({target: { result: result }});
    });
  }

  onsuccess() {}

}

class MemoryObjectStore {

  constructor() {
    this.__data = new Map();
  }

  get(key) {
    return new AsyncMemoryRequest(this.__data.get(key));
  }

  getAll() {
    return new AsyncMemoryRequest(this.__data);
  }

  put(value, key) {
    return new AsyncMemoryRequest(this.__data.set(key, value));
  }

  delete(key) {
    return new AsyncMemoryRequest(this.__data.delete(key));
  }

  clear() {
    return new AsyncMemoryRequest(this.__data.clear())
  }

}

class IndexedMemoryStorage {

  constructor() {

    const memo = new MemoryObjectStore();

    this.__transaction = {
      objectStore: () => memo
    };

  }

  transaction() {
    return this.__transaction;
  }

}

const OBJECT_STORE = 'store';
const TRANSACTION = [OBJECT_STORE];

// IndexedDB Abstraction that can be used like async Web Storage
class PersistentStorage {

  constructor(options = {}) {

    options = Object.assign({}, {
      name: location.origin,
      onUnavailable: null
    }, options);

    this.__name = options.name;

    this.__ready = new Promise(resolve => {

      try {

        let request = window.indexedDB.open(this.__name);
        let database;

        request.onupgradeneeded = e => {
          database = e.target.result;
          database.createObjectStore(OBJECT_STORE);
        };

        request.onsuccess = e => {
          database = e.target.result;
          resolve(database);
        };

        request.onerror = e => {
          database = new IndexedMemoryStorage();
          resolve(database);
        };

      } catch(e) {

        console.warn('[PersistentStorage]: indexedDB not available. Falling back to memory.', e);
        typeof options.onUnavailable === 'function' && options.onUnavailable(e);
        resolve(new IndexedMemoryStorage());

      }

    });

  }

  has(key) {
    return this.__ready.then(db => new Promise((resolve, reject) => {
      const request = db.transaction(TRANSACTION, 'readonly').objectStore(OBJECT_STORE).count(key);
      request.onsuccess = e => resolve(!!e.target.result);
      request.onerror = reject;
    }));
  }

  get(key) {
    return this.__ready.then(db => new Promise((resolve, reject) => {
      const store = db.transaction(TRANSACTION, 'readonly').objectStore(OBJECT_STORE);
      const request = key === void 0 ? store.getAll() : store.get(key);
      request.onsuccess = e => resolve(e.target.result);
      request.onerror = reject;
    }));
  }

  set(key, value) {
    return this.__ready.then(db => new Promise((resolve, reject) => {
      const request = db.transaction(TRANSACTION, 'readwrite');
      const store = request.objectStore(OBJECT_STORE);
      if (typeof key === 'object') {
        for (const k in key) {
          if (key.hasOwnProperty(k)) {
            store.put(key[k], k);
          }
        }
      } else {
        store.put(value, key);
      }
      request.onsuccess = resolve;
      request.onerror = reject;
    }));
  }

  delete(key) {

    if (key === void 0) {
      return this.clear();
    }

    return this.__ready.then(db => new Promise((resolve, reject) => {
      const request = db.transaction(TRANSACTION, 'readwrite');
      const store = request.objectStore(OBJECT_STORE);
      if (Array.isArray(key)) {
        key.forEach(k => store.delete(k));
      } else {
        store.delete(key);
      }
      request.onsuccess = resolve;
      request.onerror = reject;
    }));

  }

  clear() {
    return this.__ready.then(db => new Promise((resolve, reject) => {
      const request = db.transaction(TRANSACTION, 'readwrite').objectStore(OBJECT_STORE).clear();
      request.onsuccess = resolve;
      request.onerror = reject;
    }));
  }

  destroy() {
    return this.__ready.then(db => new Promise((resolve, reject) => {
      db.close();
      const request = window.indexedDB.deleteDatabase(this.__name);
      request.onsuccess = resolve;
      request.onerror = reject;
    }));
  }

}

const CACHE = () => CACHE.$$ || (CACHE.$$ = new PersistentStorage({
  name: 'sekoia::network::cache'
}));

function setCache(hash, value, cacheSeconds) {
  return CACHE().set(hash, {
    value: value,
    expires: Date.now() + (cacheSeconds * 1000)
  });
}

function getCache(hash) {
  return CACHE().get(hash).then(entry => {
    if (entry) {
      if (entry.expires < Date.now()) {
        CACHE().delete(hash);
        throw false;
      } else {
        return entry.value;
      }
    } else {
      throw false;
    }
  });
}

function getRequest(url, cacheSeconds = 0, token = '') {
  const hash = hashString(url);
  return getCache(hash)
    .then(data => data)
    .catch(() => makeCall(url, 'GET', token).then(res => {
      cacheSeconds > 0 && setCache(hash, res, cacheSeconds);
      return res;
    }));
}

function onRequestStart(handler, urlIncludes = '*', once = false) {
  register(handler, urlIncludes, ON_REQUEST_START, once);
}

function onRequestStop(handler, urlIncludes = '*', once = false) {
  register(handler, urlIncludes, ON_REQUEST_STOP, once);
}

function register(cb, includes, stack, once) {
  const event = {
    handler: once ? () => {
      cb();
      stack.delete(event);
    } : cb,
    includes: includes
  };
  stack.add(event);
}

function postRequest(url, data, token) {
  return makeCall(url, 'POST', token, data);
}

function putRequest(url, data, token) {
  return makeCall(url, 'PUT', token, data);
}

const NOOP = (o => o);

class ReactiveArrayInternals {

  constructor(sourceArray, options) {

    sourceArray || (sourceArray = []);

    this.nativeData =  sourceArray;

    if (options?._model_) { // reuse (cloning)

      this.model = options._model_;

    } else if (typeof options?.model === 'function') {

      this.model = data => {
        const model = options.model(data);
        if (model && model.$$) {
          model.$$.parentInternals = this;
        }
        return model;
      };

    } else {

      this.model = NOOP;

    }

    this.defaultData = [];

    for (let i = 0, item; i < sourceArray.length; i++) {
      item = sourceArray[i];
      if (item.$$) {
        item.$$.parentInternals = this;
        this.defaultData.push(deepClone(item.$$.getDefaultData()));
      } else {
        this.defaultData.push(deepClone(item));
      }
    }

    this.wildcardEvents = [];
    this.events = new Map([['*', this.wildcardEvents]]);
    this.structuralObserver = NOOP;

    this.parentInternals = null;
    this.ownPropertyName = '';

  }

  getDatum(index, writableOnly) {

    const item = this.nativeData[index];

    if (writableOnly && item?.$$) {
      return item.$$.getData(writableOnly);
    } else {
      return item;
    }

  }

  getData(writableOnly) {

    const copy = [];

    for (let i = 0, item; i < this.nativeData.length; i++) {
      item = this.nativeData[i];
      if (writableOnly && item?.$$) {
        copy.push(item.$$.getData(writableOnly));
      } else {
        copy.push(item);
      }
    }

    return copy;

  }

  getDefaultDatum(index) {
    return this.defaultData[index];
  }

  getDefaultData() {
    return this.defaultData;
  }

  setData(array, silent) {

    let didChange = array.length !== this.nativeData.length;

    this.nativeData.length = array.length;

    for (let i = 0, value, current; i < array.length; i++) {

      value = array[i];
      current = this.nativeData[i];

      if (current !== value) {

        if (current?.$$ && value && typeof value === 'object' && !value.$$) {

          current.$$.setData(value, silent); // patch object

        } else { // replace

          if (!value || value.$$ || typeof value !== 'object') {
            this.nativeData[i] = value;
          } else {
            this.nativeData[i] = this.model(value);
          }

          didChange = true;

        }

      }

    }

    if (didChange && !silent) {
      this.didMutate();
    }

  }

  setDatum(index, value, silent) {

    const current = this.nativeData[index];

    if (current !== value) {

      if (current?.$$ && value && typeof value === 'object' && !value.$$) {

        current.$$.setData(value, silent); // patch object

      } else { // replace

        if (!value || value.$$ || typeof value !== 'object') {
          this.nativeData[index] = value;
        } else {
          this.nativeData[index] = this.model(value);
        }

        if (!silent) {
          this.didMutate();
        }

      }

    }

  }

  internalize(items) {
    for (let i = 0, item; i < items.length; i++) {
      item = items[i];
      if (typeof item === 'object' && item && !item.$$) {
        items[i] = this.model(item);
      }
    }
    return items;
  }

  observe(wildcardKey, callback, unobservable, silent) {

    // ReactiveArrays have two types of observers:
    // (1) wildcard observers that fire on any array change, including public property
    // changes of nested objects.
    // (2) structural observers that only fire on structural array changes and never
    // on propagated child changes.

    this.events.get(wildcardKey).push(callback);

    if (!silent) {
      Queue.wildcardEvents.set(callback, this.owner);
      Queue.flush();
    }

    if (unobservable) {
      return () => this.wildcardEvents.splice(this.wildcardEvents.indexOf(callback), 1);
    }

  }

  setStructuralObserver(callback) {

    // a special wildcard that is only fired for structural changes
    // but never on propagation of child objects. only 1 per instance

    if (this.__structuralObserver) {

      // replace callback
      this.__structuralObserver = callback;

    } else {

      // assign callback
      this.__structuralObserver = callback;

      // register as prioritized wildcard
      this.wildcardEvents.unshift(value => {
        this.structuralObserver(value);
        this.structuralObserver = NOOP;
      });

    }

  }

  didMutate() {

    // The array buffer has been structurally modified.
    // Swap structural observer from noop to actual callback
    this.structuralObserver = this.__structuralObserver;

    // wildcards
    for (let i = 0; i < this.wildcardEvents.length; i++) {
      Queue.wildcardEvents.set(this.wildcardEvents[i], this.owner);
    }

    // parent
    if (this.parentInternals) {
      this.parentInternals.resolve(this.ownPropertyName, this.owner);
    }

    Queue.flush();

  }

  resolve() {

    // wildcards
    for (let i = 0; i < this.wildcardEvents.length; i++) {
      Queue.wildcardEvents.set(this.wildcardEvents[i], this.owner);
    }

    // parent
    if (this.parentInternals) {
      this.parentInternals.resolve(this.ownPropertyName, this.owner);
    }

    // resolve() will only be called via propagating child objects
    // so we are already flushing, do nothing else here

  }

}

class ReactiveArray extends ReactiveWrapper {

  constructor(array, options) {
    super(new ReactiveArrayInternals(array, options));
    this.$$.owner = this;
  }

  clone() {
    return new this.constructor(this.$$.defaultData, {
      _model_: this.$$.model
    });
  }

  // Accessors & Iterators

  get length() {
    return this.$$.nativeData.length;
  }

  every(callbackFn) {
    return this.$$.nativeData.every(callbackFn);
  }

  some(callbackFn) {
    return this.$$.nativeData.some(callbackFn);
  }

  findIndex(callbackFn) {
    return this.$$.nativeData.findIndex(callbackFn);
  }

  findLastIndex(callbackFn) {
    const array = this.$$.nativeData;
    let i = array.length;
    while (i--) {
      if (callbackFn(array[i], i, array)) {
        return i;
      }
    }
    return -1;
  }

  includes(item) {
    return this.$$.nativeData.includes(item);
  }

  indexOf(item, fromIndex) {
    return this.$$.nativeData.indexOf(item, fromIndex);
  }

  lastIndexOf(item, fromIndex) {
    return this.$$.nativeData.lastIndexOf(item, fromIndex);
  }

  find(callbackFn) {
    return this.$$.nativeData.find(callbackFn);
  }

  slice(start) {
    return this.$$.nativeData.slice(start);
  }

  concat(...arrays) {
    return this.$$.nativeData.concat(...arrays);
  }

  forEach(callbackFn) {
    return this.$$.nativeData.forEach(callbackFn);
  }

  filter(compareFn) {
    return this.$$.nativeData.filter(compareFn);
  }

  map(callbackFn) {
    return this.$$.nativeData.map(callbackFn);
  }

  reduce(reducerFn, initialValue) {
    return this.$$.nativeData.reduce(reducerFn, initialValue);
  }

  // Mutators

  pop() {
    if (this.$$.nativeData.length) {
      const value = this.$$.nativeData.pop();
      this.$$.didMutate();
      return value;
    }
  }

  push(...items) {
    this.$$.nativeData.push(...this.$$.internalize(items));
    this.$$.didMutate();
  }

  shift() {
    if (this.$$.nativeData.length) {
      const value = this.$$.nativeData.shift();
      this.$$.didMutate();
      return value;
    }
  }

  unshift(...items) {
    this.$$.nativeData.unshift(...this.$$.internalize(items));
    this.$$.didMutate();
  }

  splice(start, deleteCount, ...items) {

    if (!deleteCount && !items.length) { // noop

      return [];

    } else if (!items.length) { // remove items

      const removedItems = this.$$.nativeData.splice(start, deleteCount);
      this.$$.didMutate();
      return removedItems;

    } else { // remove/add

      const removedItems = this.$$.nativeData.splice(start, deleteCount, ...this.$$.internalize(items));
      this.$$.didMutate();
      return removedItems;

    }

  }

  reverse() {
    if (this.$$.nativeData.length > 1) {
      this.$$.nativeData.reverse();
      this.$$.didMutate();
    }
  }

  sort(compareFn) {

    const array = this.$$.nativeData;

    if (array.length > 1) {

      const copy = array.slice(0);
      array.sort(compareFn);

      for (let i = 0; i < array.length; i++) {
        if (array[i] !== copy[i]) {
          this.$$.didMutate();
          break;
        }
      }

    }

  }

  filterInPlace(compareFn) {

    const array = this.$$.nativeData;

    let didChange = false;

    for (let i = array.length - 1; i >= 0; i--) {
      if (!compareFn(array[i], i, array)) {
        array.splice(i, 1);
        didChange = true;
      }
    }

    if (didChange) {
      this.$$.didMutate();
    }

  }

  concatInPlace(array, prepend = false) {

    if (array?.length) {

      if (prepend) {
        this.$$.nativeData.unshift(...this.$$.internalize(array));
      } else {
        this.$$.nativeData.push(...this.$$.internalize(array));
      }

      this.$$.didMutate();

    }

  }

  clear() {

    const array = this.$$.nativeData;

    if (array.length) {
      while (array.length) array.pop();
      this.$$.didMutate();
    }

  }

  // Observability

  observe(callback, options = {}) {
    if ((options.throttle || 0) > 0) {
      return this.$$.observe('*', Queue.throttle(callback, options.throttle), options.cancelable, options.silent);
    } else if ((options.defer || 0) > 0) {
      return this.$$.observe('*', defer(callback, options.defer), options.cancelable, options.silent);
    } else {
      return this.$$.observe('*', callback, options.cancelable, options.silent);
    }
  }

  // Time Travel

  track(options = {}) {

    if (this.$$.stateTracker) {
      throw new Error(`Cannot track state of ReactiveArray because it is already being tracked.`);
    }

    const tracker = this.$$.stateTracker = new StateTracker(options.onTrack, options.maxEntries);

    // check ReactiveObject.track() for explanation
    const checkUniqueness = (options.throttle || 0) > 0 || (options.defer || 0) > 0;

    // observer immediately tracks initial state
    this.$$.observe('*', val => tracker.add(val, checkUniqueness), false, false);

  }

  undo() {
    this.restore(this.$$.stateTracker?.prev());
  }

  redo() {
    this.restore(this.$$.stateTracker?.next());
  }

  restore(trackPosition) {
    const tracker = this.$$.stateTracker;
    if (tracker && tracker.has(trackPosition)) {
      this.$$.setData(tracker.get(trackPosition), false);
    }
  }

}

function createState(objectOrArray, options) {
  if (Array.isArray(objectOrArray)) {
    return new ReactiveArray(objectOrArray, options);
  } else {
    return new ReactiveObject(objectOrArray);
  }
}

function throttle (callback, interval) {
  let pending = 0;
  const reset = () => (pending = 0);
  return arg => {
    if (!pending) {
      callback(arg);
      pending = setTimeout(reset, interval);
    }
  }
}

// Component

//removeIf(esModule)
const Sekoia = {
  createElement,
  defineComponent,
  onResize,
  renderList,
  Router,
  deleteRequest,
  getRequest,
  onRequestStart,
  onRequestStop,
  postRequest,
  putRequest,
  createState,
  PersistentStorage,
  ReactiveArray,
  ReactiveObject,
  deepClone,
  deepEqual,
  hashString,
  throttle,
  defer
};

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = Sekoia;
} else if (typeof define === 'function' && define.amd) {
  define('Sekoia', [], function() {
    return Sekoia;
  });
} else {
  window.Sekoia = Sekoia;
}
//endRemoveIf(esModule)
}(window || this));
