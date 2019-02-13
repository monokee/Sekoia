(function(global) {

  /*
   *
   * 🧿 Cue - Reactive Data-Driven Web Apps
   *
   * @author Jonathan M. Ochmann for color.io
   * Copyright 2019 Patchflyer GmbH
   *
   */

  // Builtins
  const OBJ = Object;
  const ARR = Array;
  const OBJ_ID = '[object Object]';
  const EMPTY_MAP = new Map();

  // Static Object/Array Helpers
  const oAssign = OBJ.assign;
  const oCreate = OBJ.create;
  const oDefineProperty = OBJ.defineProperty;
  const oGetPrototypeOf = OBJ.getPrototypeOf;
  const oProtoToString = OBJ.prototype.toString;

  // Utility methods
  const NOOP = () => {};
  const oKeys = OBJ.keys;
  const isArray = ARR.isArray;
  const toArray = ARR.from;
  const isObjectLike = o => typeof o === 'object' && o !== null;
  const isPlainObject = o => isObjectLike(o) && (oProtoToString.call(o) === OBJ_ID || oGetPrototypeOf(o) === null);
  const isFunction = fn => typeof fn === 'function';
  const wrap = fn => fn();

  let uid = 0;
  const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
  const createUID = name => {
    let n, o = '',
      alphaHex = uid.toString(26).split('');
    while ((n = alphaHex.shift())) o += ALPHABET[parseInt(n, 26)];
    uid++;
    return `${name||'cue'}_${o}`;
  };

  // Cue Library Object
  const LIB = {};
  // Cue State Library Object
  const STATE_MODULE = oCreate(LIB);
  // Cue UI Library Object
  const UI_COMPONENT = oCreate(LIB);

  // Cue API Object that internal modules attach their public api to (properties will be exposed on global.Cue)
  const CUE_API = {};

  CUE_API.EventBus = wrap(() => {

    const eventStore = new Map();
    const eventError = `Can't add listener because the provided arguments are invalid.`;

    let _type, _handler, _scope, _events, _event, _disposable = [];

    const addEvent = (type, handler, scope, once) => {
      const event = {
        handler: handler,
        scope: scope,
        once: once
      };
      if (eventStore.has(type)) {
        eventStore.get(type).push(event);
      } else {
        eventStore.set(type, [event]);
      }
    };

    const addEvents = (events, scope, once) => {
      for (_type in events) {
        _handler = events[_type];
        if (isFunction(_handler)) {
          addEvent(_type, _handler, scope, once);
        } else {
          throw new TypeError(`Can't add listener because handler for "${_type}" is not a function but of type ${typeof _handler}`);
        }
      }
    };

    return {

      on: (type, handler, scope) => {
        if (isObjectLike(type)) {
          _scope = isObjectLike(handler) ? handler : null;
          addEvents(type, _scope, false);
        } else if (typeof type === 'string' && isFunction(handler)) {
          _scope = isObjectLike(scope) ? scope : null;
          addEvent(type, handler, _scope, false);
        } else {
          throw new TypeError(eventError);
        }
      },

      once: (type, handler, scope) => {
        if (isObjectLike(type)) {
          _scope = isObjectLike(handler) ? handler : null;
          addEvents(type, _scope, true);
        } else if (typeof type === 'string' && isFunction(handler)) {
          _scope = isObjectLike(scope) ? scope : null;
          addEvent(type, handler, _scope, true);
        } else {
          throw new TypeError(eventError);
        }
      },

      off: type => {
        eventStore.delete(type);
      },

      trigger: (type, ...payload) => {
        if ((_events = eventStore.get(type))) {
          for (let i = 0; i < _events.length; i++) {
            _event = _events[i];
            _event.handler.apply(_event.scope, payload);
            if (_event.once) _disposable.push(_event);
          }
          if (_disposable.length) {
            eventStore.set(type, _events.filter(event => _disposable.indexOf(event) === -1));
            _disposable.splice(0, _disposable.length);
          }
          _events = null;
        }
      }

    }

  });

  /**
   * Cue.State - The granular reactivity engine behind Cue.
   *
   * Has the following built-in concepts:
   * - User defined modules have declarative default properties, computed properties and actions.
   * - Modules are blueprints from which state instances can be created using factory functions.
   * - Modules are like classes but specifically optimized for reactive state modeling.
   * - Modules can import other Modules which they extend themselves with.
   * - Property change interception (willChange handlers)
   * - Change reaction handling (didChange handlers and external reactions for side-effects)
   * - Chain-able and micro-optimized computed properties
   */

  // Registered State Modules: name -> lazy factory
  const CUE_STATE_MODULES = new Map();

  // Internals of State Modules for internally passing module data around: name -> object
  const CUE_STATE_INTERNALS = new Map();

  // State Flags
  let isReacting = false; // is a reaction currently in process?
  let isAccumulating = false; // are we accumulating observers and derivatives because a change is part of a multi-property-change action?
  const accumulatedDerivatives = []; // derivatives which are accumulated during batch operations (emptied after each batch!)
  // Reaction Queue
  const MAIN_QUEUE = [];

  // Global derivative installer payload
  const DERIVATIVE_INSTALLER = {
    derivative: null,
    allProperties: null,
    derivedProperties: null
  };

  // Traversal Directions (needed for dependency branch walking)
  const TRAVERSE_DOWN = -1;
  const TRAVERSE_UP = 1;

  // Meta Keys used for closure scope lookup && safely extending foreign objects
  const __CUE__ = Symbol('🧿 Cue Internals');

  const STATE_TYPE_INSTANCE = 1;
  const STATE_TYPE_EXTENSION = 2;

  // Root State Store
  const CUE_ROOT_STATE = {};
  oDefineProperty(CUE_ROOT_STATE, __CUE__, {
    value: {
      name: '::ROOT::',
      module: {
        name: '::ROOT::'
      },
      type: STATE_TYPE_INSTANCE,
      plainState: CUE_ROOT_STATE,
      proxyState: CUE_ROOT_STATE,
      observersOf: EMPTY_MAP,
      derivativesOf: EMPTY_MAP,
      consumersOf: EMPTY_MAP,
      providersToInstall: EMPTY_MAP,
      derivativesToInstall: EMPTY_MAP,
      internalGetters: EMPTY_MAP,
      internalSetters: EMPTY_MAP
    }
  });

  /**
   * Reverse engineered array mutator methods that allow for fine-grained change detection and mutation interception.
   * Implemented largely based on ECMAScript specification (where it makes sense for our purposes).
   */

  function intercepted_array_fill(value, start = 0, end = this.length) {

    if (arguments.length === 0 || this.length === 0 || start === end) { // noop
      return this;
    }

    const internals = this[__CUE__];
    const array = internals.plainState;

    if (typeof value === 'object' && value !== null) {
      value = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);
    }

    for (let i = start, oldValue, subInternals; i < end; i++) {
      oldValue = array[i];
      if (oldValue !== value) {
        array[i] = value;
        if (value && (subInternals = value[__CUE__]) && subInternals.mounted === false) {
          subInternals.instanceDidMount(array, i);
          createAndMountSubStates(subInternals);
        }
        internals.propertyDidChange(i);
      }
    }

    react();

    return this;

  }

  function intercepted_array_push(...rest) {

    if (rest.length > 0) {

      const internals = this[__CUE__];
      const array = internals.plainState;

      for (let i = 0, value, subInternals; i < rest.length; i++) {

        value = rest[i];

        if (typeof value === 'object' && value !== null) {

          subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);

          array.push(subInternals.proxyState);
          subInternals.instanceDidMount(array, array.length - 1);
          createAndMountSubStates(subInternals);

        } else {

          array.push(value);

        }

        internals.propertyDidChange(array.length - 1);

      }

      react();

    }

    return this.length; // comply with default push return

  }

  function intercepted_array_unshift(...rest) {

    if (rest.length > 0) {

      const internals = this[__CUE__];
      const array = internals.plainState;

      let i = rest.length,
        value, subInternals;
      while (--i >= 0) {

        value = rest[i];

        if (typeof value === 'object' && value !== null) {

          subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);

          if (subInternals.mounted === false) {
            array.unshift(subInternals.proxyState);
            subInternals.instanceDidMount(array, 0);
            createAndMountSubStates(subInternals);
          }

        } else {

          array.unshift(value);

        }

        internals.propertyDidChange(0);

      }

      react();

    }

    return this.length; // comply with default unshift return

  }

  function intercepted_array_splice(start, deleteCount, ...items) {

    const internals = this[__CUE__];
    const array = internals.plainState;

    const len = array.length;
    const actualStart = start < 0 ? Math.max((len + start), 0) : Math.min(start, len);

    let insertCount, actualDeleteCount;
    if (arguments.length === 1) {
      insertCount = 0;
      actualDeleteCount = len - actualStart;
    } else {
      insertCount = items.length;
      actualDeleteCount = Math.min(Math.max(deleteCount, 0), len - actualStart);
    }

    const deleted = [],
      notified = [];

    // 1. delete elements from array, collected on "deleted", notify state of unmount if deleted elements are state objects. if we're deleting from an index that we will not be adding a replacement for, cue the property
    if (actualDeleteCount > 0) {

      let i = actualStart + actualDeleteCount,
        oldValue, subState;

      while (--i >= actualStart) {

        oldValue = array[i];

        if (oldValue && (subState = oldValue[__CUE__])) {
          subState.instanceWillUnmount();
        }

        array.splice(i, 1);
        internals.propertyDidChange(i);

        notified.push(i);
        deleted.push(oldValue);

      }

    }

    // 2. add elements to array, check if they have to be mounted and cue the property.
    if (insertCount > 0) {

      for (let i = 0, value, arrayIndex, subInternals; i < insertCount; i++) {

        value = items[i];
        arrayIndex = actualStart + i;

        if (typeof value === 'object' && value !== null) {

          subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);

          if (subInternals.mounted === false) {
            array.splice(arrayIndex, 0, subInternals.proxyState);
            subInternals.instanceDidMount(array, arrayIndex);
            createAndMountSubStates(subInternals);
          }

        } else {

          array.splice(arrayIndex, 0, value);

        }

        if (notified.indexOf(arrayIndex) === -1) {
          internals.propertyDidChange(arrayIndex);
        }

      }

    }

    react();

    return deleted;

  }

  function intercepted_array_pop() {

    const internals = this[__CUE__];
    const array = internals.plainState;

    if (array.length === 0) {
      return undefined;
    }

    const last = array[array.length - 1];
    const subInternals = last ? last[__CUE__] : undefined;

    if (subInternals) {
      subInternals.instanceWillUnmount();
    }

    delete array[array.length - 1];

    internals.propertyDidChange(array.length);
    react();

    return last;

  }

  function intercepted_array_shift() {

    const internals = this[__CUE__];
    const array = internals.plainState;

    if (array.length === 0) {
      return undefined;
    }

    const last = array[0];
    const subInternals = last ? last[__CUE__] : undefined;

    if (subInternals) {
      subInternals.instanceWillUnmount();
    }

    array.shift();

    internals.propertyDidChange(0);
    react();

    return last;

  }

  function intercepted_array_copyWithin(target, start = 0, end = this.length) {

    const internals = this[__CUE__];
    const array = internals.plainState;

    const len = array.length;
    let to = target < 0 ? Math.max((len + target), 0) : Math.min(target, len);
    let from = start < 0 ? Math.max((len + start), 0) : Math.min(start, len);
    const final = end < 0 ? Math.max((len + end), 0) : Math.min(end, len);
    let count = Math.min(final - from, len - to);

    let direction;
    if (from < to && to < from + count) {
      direction = -1;
      from = from + count - 1;
      to = to + count - 1;
    } else {
      direction = 1;
    }

    let value, subState;
    while (count > 0) {
      if (from in array) {
        value = array[from];
        if (value && value[__CUE__]) {
          throw new Error(`You can't create copies of Cue State Instances via Array.prototype.copyWithin.`);
        }
        array[to] = array[from];
        internals.propertyDidChange(to);
      } else {
        value = array[to];
        if (value && (subState = value[__CUE__])) {
          subState.instanceWillUnmount();
        }
        delete array[to];
        internals.propertyDidChange(to);
      }
      from += direction;
      to += direction;
      count -= 1;
    }

    react();

    return array;

  }

  function intercepted_array_reverse() {

    const internals = this[__CUE__];
    const array = internals.plainState;

    array.reverse();

    for (let i = 0; i < array.length; i++) {
      internals.propertyDidChange(i);
    }

    react();

    return array;

  }

  function intercepted_array_sort(compareFunction) {

    const internals = this[__CUE__];
    const array = internals.plainState;
    const before = array.slice();

    array.sort(compareFunction);

    for (let i = 0; i < array.length; i++) {
      if (array[i] !== before[i]) {
        internals.propertyDidChange(i);
      }
    }

    react();

    return array;

  }

  // These are the only internalGetters of reactive arrays.
  // We get these via function calls like we get all other internalGetters from proxyGetInterceptor.
  // This avoids an additional lookup.
  const ARRAY_MUTATOR_GETTERS = new Map([
  ['fill', () => intercepted_array_fill],
  ['push', () => intercepted_array_push],
  ['unshift', () => intercepted_array_unshift],
  ['splice', () => intercepted_array_splice],
  ['pop', () => intercepted_array_pop],
  ['shift', () => intercepted_array_shift],
  ['copyWithin', () => intercepted_array_copyWithin],
  ['reverse', () => intercepted_array_reverse],
  ['sort', () => intercepted_array_sort]
]);

  /**
   * Creates deep clone of serializable plain object.
   * Object must only contain primitives, plain objects or arrays.
   * @function deepClonePlainObject
   * @param   {Object} o      - The plain object to clone.
   * @returns {Object} clone  - Deeply cloned plain object.
   */
  function deepClonePlainObject(o) {

    const clone = {};
    const keys = oKeys(o);

    for (let i = 0, prop, val; i < keys.length; i++) {
      prop = keys[i];
      val = o[prop];
      clone[prop] = !val ? val : isArray(val) ? deepCloneArray(val) : typeof val === 'object' ? deepClonePlainObject(val) : val;
    }

    return clone;

  }

  /**
   * Creates deep clone of serializable Array.
   * Array must only contain primitives, plain objects or arrays.
   * @function deepCloneArray
   * @param   {Array} a      - The plain array to clone.
   * @returns {Array} clone  - Deeply cloned array.
   */
  function deepCloneArray(a) {

    const clone = [];

    for (let i = 0, val; i < a.length; i++) {
      val = a[i];
      clone[i] = !val ? val : isArray(val) ? deepCloneArray(val) : typeof val === 'object' ? deepClonePlainObject(val) : val;
    }

    return clone;

  }

  /**
   * State reconciliation to "batch-patch" data collections into the current state tree.
   * Instead of replacing the entire tree, the algorithm attempts to mutate existing data points in the "parent[property]" object
   * to match the shape of the provided "value" object. This avoids unnecessary change-reactions throughout the system.
   * @param parent    - The parent object graph holding a property that contains the object to be patched.
   * @param property  - The target property name of the object to be patched on the parent node graph.
   * @param value     - The object dictating the future shape of parent[property].
   * @param [key]     - When provided, this key is used to determine object equality.
   */
  function patchState(parent, property, value, key = 'id') {

    const previous = parent[property];

    if (value === previous) {
      return;
    }

    if (previous === null || previous === undefined || value === null || typeof value !== 'object') {
      if (value === undefined) {
        delete parent[property]
      } else {
        parent[property] = value;
      }
      return;
    }

    if (isArray(value)) {

      if (value.length && previous.length && (key && value[0][key] != null)) {

        let i, j, start, end, newEnd, item, newIndicesNext, keyVal, temp = new Array(value.length),
          newIndices = new Map();

        // skip common prefix and suffix
        for (start = 0, end = Math.min(previous.length, value.length); start < end && (previous[start] === value[start] || key && previous[start][key] === value[start][key]); start++) {
          patchState(previous, start, value[start], key);
        }

        for (end = previous.length - 1, newEnd = value.length - 1; end >= 0 && newEnd >= 0 && (previous[end] === value[newEnd] || key && previous[end][key] === value[newEnd][key]); end--, newEnd--) {
          temp[newEnd] = previous[end];
        }

        // prepare a map of all indices in value
        newIndicesNext = new Array(newEnd + 1);

        for (j = newEnd; j >= start; j--) {
          item = value[j];
          keyVal = key ? item[key] : item;
          i = newIndices.get(keyVal);
          newIndicesNext[j] = i === undefined ? -1 : i;
          newIndices.set(keyVal, j);
        }

        // step through all old items to check reuse
        for (i = start; i <= end; i++) {
          item = previous[i];
          keyVal = key ? item[key] : item;
          j = newIndices.get(keyVal);
          if (j !== undefined && j !== -1) {
            temp[j] = previous[i];
            j = newIndicesNext[j];
            newIndices.set(keyVal, j);
          }
        }

        // set all the new values
        for (j = start; j < value.length; j++) {

          if (temp.hasOwnProperty(j)) {

            if (previous[j] !== temp[j]) {
              if (temp[j] === undefined) {
                delete previous[j];
              } else {
                previous[j] = temp[j];
              }
            }

            patchState(previous, j, value[j], key);

          } else {

            if (previous[j] !== value[j]) {
              if (value[j] === undefined) {
                delete previous[j];
              } else {
                previous[j] = value[j];
              }
            }

          }

        }

      } else {

        for (let i = 0, len = value.length; i < len; i++) {
          patchState(previous, i, value[i], key);
        }

      }

      if (previous.length > value.length) {
        previous.length = value.length;
      }

    } else {

      const valueKeys = Object.keys(value);
      for (let i = 0, len = valueKeys.length; i < len; i++) {
        patchState(previous, valueKeys[i], value[valueKeys[i]], key);
      }

      const previousKeys = Object.keys(previous);
      for (let i = 0, len = previousKeys.length; i < len; i++) {
        if (value[previousKeys[i]] === undefined && previous[previousKeys[i]] !== undefined) {
          delete previous[previousKeys[i]];
        }
      }

    }

  }

  /**
   * One-level (shallow), ordered equality check.
   * Works for primitives, plain objects and arrays.
   * Other object types are not supported.
   * @function areShallowEqual
   * @param     {*}       a - Compare this to:
   * @param     {*}       b - this...
   * @returns   {boolean}   - True or false, depending on the evaluated shallow equality.
   * */
  function areShallowEqual(a, b) {

    if (isArray(a)) return !isArray(b) || a.length !== b.length ? false : areArraysShallowEqual(a, b);

    if (typeof a === 'object') return typeof b !== 'object' || (a === null || b === null) && a !== b ? false : arePlainObjectsShallowEqual(a, b);

    return a === b;

  }

  /**
   * One-level (shallow), ordered equality check for arrays.
   * Specifically optimized for "areShallowEqual" which pre-compares array length!
   * @function areArraysShallowEqual
   * @param   {Array}  a - The array that is compared to:
   * @param   {Array}  b - this other array.
   * @returns {boolean}  - True if a and b are shallow equal, else false.
   * */
  function areArraysShallowEqual(a, b) {

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;

  }

  /**
   * One-level (shallow), ordered equality check for plain old javascript objects.
   * @function arePlainObjectsShallowEqual
   * @param   {Object}  a - The object that is compared to:
   * @param   {Object}  b - this other object.
   * @returns {boolean}   - True if a and b are shallow equal, else false.
   * */
  function arePlainObjectsShallowEqual(a, b) {

    const keysA = oKeys(a);
    const keysB = oKeys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (let i = 0, k; i < keysA.length; i++) {
      k = keysA[i];
      if (keysB.indexOf(k) === -1 || a[k] !== b[k]) {
        return false;
      }
    }

    return true;

  }

  /**
   * Retrieve a deep copy (Snapshot) of the current state.
   * Generic method that is called from instances via internalGetters (see buildStateModule.js)
   * @param [asJSON = false] - Whether or not the snapshot should be retrieved as a JSON string or not. Defaults to false.
   * @returns A deep clone of the state instance.
   */
  function retrieveState(asJSON = false) {
    const internals = this[__CUE__];
    const clone = isArray(internals.plainState) ? deepCloneArray(internals.plainState) : deepClonePlainObject(internals.plainState);
    return asJSON ? JSON.stringify(clone) : clone;
  }

  /**
   * Apply a state snapshot (props) to a state instance.
   * Internally reconciles the passed props with the existing state and mutates the shape of the existing state to match the shape of the props.
   * Allows for top-down batch operations that mimic an immutable interface while the atomic internal change detection and mutation notifications continue to work as expected.
   * @param props - JSON string, object literal or array that will be patched into the current state, causing all mutated properties to queue their dependencies throughout the tree.
   */
  function applyState(props) {

    // For batch-applying data collections from immutable sources.
    // Internally reconciles the passed props with the existing state tree and only mutates the deltas.
    // Immediate reactions of the mutated properties are collected on an accumulation stack.
    // Only after the batch operation has finished, the accumulated reactions queue their dependencies and we react in a single flush.
    //TODO: defer all recursive lookups involving provided properties (upstream/downstream) until after applyState is done reconciling.
    // OR BETTER YET: completely work around any proxy interception for batch updates. create a specific set method that is called DIRECTLY from patchState
    // that collects only unique immediate dependencies on an accumulation stack. after patchState has run, we explicitly cue up the dependencies of the accumulated dependencies (including setters to provided states)
    // and only then react to the collective change in a single batch. This will be insanely performant because every change will only be evaluated and reacted to once. This is huge!
    // THIS has the other advantage that I can also reduce the cue and react logic because we no longer have to check for accumulations as this is explicitly outsourced to a special callback.

    const internals = this[__CUE__];

    if (props.constructor === String) {
      props = JSON.parse(props);
    }

    isAccumulating = true;
    patchState(internals.rootInternals.proxyState, internals.rootPropertyName, props);
    isAccumulating = false;

    cueAccumulated();
    react();

  }

  /**
   * Find the first state instance that has only consumers but no further providers of a provided property.
   * @param {object} provider - The provider of a property value. If the value has been provided to the provider, recurse until provider has no more providers.
   * @return {object}         - The root provider of the initially passed provider. Might be the initially passed provider if it doesn't have superProviders.
   */
  function getRootProvider(provider) {
    const superProvider = provider.sourceInternals.providersOf.get(provider.sourceProperty);
    return superProvider ? getRootProvider(superProvider) : provider;
  }

  /**
   * This is a blueprint that is created during module registration. It will be used at instantiation time
   * to create a real Provider interfaces for the actual instances. ProviderDescription is a class so we can easily use instanceof.
   */
  class ProviderDescription {

    /**
     * Creates an object that describes a property transduction that we store on modules that have injected properties. It is the return value of Module.inject().
     * @param {string}  sourceModule    - The name of the module that provides a piece of data
     * @param {string}  sourceProperty  - The name of the provided property as defined on the provider module
     * @param {boolean} readOnly        - Whether the consumers of the provider have read-write or read-only capabilities
     */
    constructor(sourceModule, sourceProperty, readOnly) {

      this.sourceModule = sourceModule;
      this.sourceProperty = sourceProperty;
      this.readOnly = readOnly === true;

      // will be added after construction, just here for clarity.
      this.targetModule = undefined;
      this.targetProperty = undefined;

    }

  }

  /**
   * Installs a weak link to a consuming child module on a parent module that will provide data to it.
   * @param targetModule    {string}          - The name of the module that is consuming data from a provider.
   * @param targetProperty  {(string|number)} - The name of the property on the targetModule that is consuming the sourceProperty on the sourceModule.
   * @param sourceModule    {string}          - The name of the module that is providing data to the targetModule.
   * @param sourceProperty  {(string|number)} - The name of the property on the sourceModule that is providing data to the targetProperty on the targetModule.
   */
  function referenceConsumer(targetModule, targetProperty, sourceModule, sourceProperty) {

    // TODO: as an optimization, we should count the number of instances that consume a property.
    //  that way we can stop the dynamic lookup when all instances have been notified at runtime!

    const ConsumerReference = {
      targetModule,
      targetProperty,
      sourceModule,
      sourceProperty
    };

    const source = CUE_STATE_INTERNALS.get(sourceModule);

    if (source.consumersOf.has(sourceProperty)) {

      const consumers = source.consumersOf.get(sourceProperty);

      let exists = false,
        i = -1;
      while (++i < consumers.length && exists === false) {
        if (
          consumers[i].targetModule === targetModule &&
          consumers[i].targetProperty === targetProperty &&
          consumers[i].sourceModule === sourceModule &&
          consumers[i].sourceProperty === sourceProperty
        ) exists = true;
      }

      if (exists === false) {
        source.consumersOf.get(sourceProperty).push(ConsumerReference);
      }

    } else {

      source.consumersOf.set(sourceProperty, [ConsumerReference]);

    }

  }

  /**
   * Creates a new computed property instance.
   * @class Derivative
   */
  class Derivative {

    /**
     * @constructs
     * @param {string}    ownPropertyName   - The name of the derived property on the parent node graph (state instance).
     * @param {function}  computation       - The pure computation function that should return its result.
     * @param {array}     sourceProperties  - Array of property keys that this derivative depends on.
     */
    constructor(ownPropertyName, computation, sourceProperties) {

      this.ownPropertyName = ownPropertyName;
      this.computation = computation; // the function that computes a result from data points on the source
      this.sourceProperties = sourceProperties; // property names this derivative depends on

      this.subDerivatives = []; // other derivatives that depend on this derivative. Allows for downwards traversal.
      this.superDerivatives = []; // if derivative is derived from other derivative(s), set superDerivative(s). Allows for upwards traversal.
      this.observers = [];

      this.valueCache = oCreate(null); // property-value cache

      this.intermediate = undefined; // intermediate computation result
      this._value = undefined; // current computation result

      this.stopPropagation = false; // flag for the last observed derivative in a dependency branch (optimization)
      this.needsUpdate = false; // flag indicating that one or many dependencies have been updated (required by this.value getter)
      this.hasChanged = false; // flag indicating that the computation has yielded a new result (required for dependency traversal)

    }

    /**
     * Dynamic getter of computation result which recomputes only when a direct (shallow) dependency has been previously updated
     * @return {*} The current value of the derivative
     */
    get value() {

      if (this.needsUpdate) {

        // recompute
        this.intermediate = this.computation.call(null, this.valueCache);

        // shallow compare to previous value
        if (areShallowEqual(this._value, this.intermediate)) {

          this.hasChanged = false;

        } else {

          // shallow cache computation result
          if (isArray(this.intermediate)) {
            this._value = this.intermediate.slice();
          } else if (typeof this.intermediate === 'object' && this.intermediate !== null) {
            this._value = oAssign({}, this.intermediate);
          } else {
            this._value = this.intermediate;
          }

          this.hasChanged = true;

        }

        // computation is up to date (until it gets invalidated by changing a dependency again...)
        this.needsUpdate = false;

      }

      return this._value;

    }

    /**
     * Update a single sourceProperty of the derivative by updating the internal valueCache.
     * Flag needsUpdate to true so that the next request to value getter will recompute.
     * @param {string} property - The property that needs to update its value
     * @param {*}      value    - The new value. This value is guaranteed to have changed(!)
     */
    updateProperty(property, value) {
      // update a single dependency of the derivative.
      // the passed value is guaranteed to have changed
      this.valueCache[property] = value;
      // because a dependency has been updated, we need to recompute
      // this.value the next time it is requested.
      this.needsUpdate = true;
    }

    /**
     * Pull in all dependency values from source. Used at instantiation time to fill cache with initial values
     * @param {object} source - The source state object from which values should be pulled into the internal cache.
     */
    fillCache(source) {
      // pulls in all dependency values from source object
      for (let i = 0, k; i < this.sourceProperties.length; i++) {
        k = this.sourceProperties[i];
        this.valueCache[k] = source[k];
      }
      this.needsUpdate = true;
    }

    /**
     * Dispose this derivative by nullifying its strong pointers and removing itself from its computation branch.
     * @param {boolean} root - required for recursive calls to self. see inline comments below
     */
    dispose(root = true) {

      let i;

      // clear anything that could potentially hold on to strong pointers
      this.valueCache = undefined;
      this.observers = undefined;
      this.intermediate = undefined;
      this._value = undefined;

      // remove self from any superDerivatives
      for (i = 0; i < this.superDerivatives.length; i++) {
        this.superDerivatives[i].subDerivatives = this.superDerivatives[i].subDerivatives.filter(d => d !== this);
        // reset end of observation
        flagClosestObservedSuperDerivativesOf(this.superDerivatives[i], true);
      }

      // dispose all sub-derivatives
      for (i = 0; i < this.subDerivatives.length; i++) {
        this.subDerivatives[i].dispose(false); // false -> downwards recursion form root of removal
      }

      // if root of removal, reset end of propagation downwards from parent node branches.
      if (root) {
        for (i = 0; i < this.superDerivatives.length; i++) {
          setEndOfPropagationInBranchOf(this.superDerivatives[i], TRAVERSE_DOWN);
        }
      }

      this.superDerivatives = undefined;

    }

  }

  /**
   * Topological sorter to resolve dependencies of derivatives
   * @namespace OrderedDerivatives
   * @property {(null|Map)} source - Placeholder for the Map of vDerivatives to be sorted. Nullified after each job.
   * @property {Array} visited - Placeholder for visited properties. Helper for topological sorter. Emptied after each job.
   */
  const OrderedDerivatives = {

    source: null,
    visited: [],

    /**
     * Public method which resolves dependency order of computed properties.
     * @param   {Map}   derivatives - unordered vDerivatives
     * @returns {Map}   target      - vDerivatives in resolved dependency order
     */
    from(derivatives) {

      this.source = derivatives;

      const target = new Map();

      let sourceProperty;
      for (sourceProperty of derivatives.keys()) {
        this._visit(sourceProperty, [], target);
      }

      this.source = null;
      this.visited.splice(0, this.visited.length);

      return target;

    },

    /**
     * Private Method used for topological sorting.
     * Detects circular dependencies and throws.
     * @param {string} sourceProperty - The property name of the derivative on its source object.
     * @param {Array}  dependencies   - An array we're passing around to collect the property names that the derivative depends on.
     * @param {Map}    target         - The ordered Map to which a derivative is added after all of its dependencies are resolved.
     */
    _visit(sourceProperty, dependencies, target) {

      if (this.source.has(sourceProperty)) {

        dependencies.push(sourceProperty);
        this.visited.push(sourceProperty);

        const derivative = this.source.get(sourceProperty);

        for (let i = 0, name; i < derivative.sourceProperties.length; i++) {

          name = derivative.sourceProperties[i];

          if (dependencies.indexOf(name) !== -1) {
            throw new Error(`Circular dependency. "${derivative.ownPropertyName}" is required by "${name}": ${dependencies.join(' -> ')}`);
          }

          if (this.visited.indexOf(name) === -1) {
            this._visit(name, dependencies, target);
          }

        }

        if (!target.has(sourceProperty)) {
          target.set(sourceProperty, derivative);
        }

      }

    }

  };

  /**
   * Creates a dependency graph on the vDerivatives stored on a state module.
   * vDerivatives are used at runtime to quickly create instances of Derivatives.
   * Here we create a proxy object around the original config.props (allProperties) and call
   * the computations of the computed properties in the context of this proxy. The proxy will
   * intercept any "get" requests that the computations perform and thus figures out which properties
   * the computation depends on. As a convention it is encouraged that computations should destructure their dependencies from their first
   * function argument instead of dotting into "this" to ensure all dependencies are reached even when they are requested from within conditionals.
   * @function installDependencies
   * @param {Object}  allProperties       - config.props object containing both normal and computed properties.
   * @param {Map}     computedProperties  - Map of computed Properties -> vDerivatives.
   * */
  function installDependencies(allProperties, computedProperties) {

    // set the current installer payload
    oAssign(DERIVATIVE_INSTALLER, {
      allProperties: allProperties,
      computedProperties: computedProperties
    });

    // intercept get requests to props object to grab sourceProperties
    const installer = new Proxy(allProperties, {
      get: dependencyGetInterceptor
    });

    // call each computation which will trigger the intercepted get requests
    let derivative;
    for (derivative of computedProperties.values()) {

      DERIVATIVE_INSTALLER.derivative = derivative;

      try {
        // the computation itself will most definitely fail but we only care about the property dependencies so we can safely ignore all errors.
        derivative.computation.call(installer, installer);
      } catch (e) {}

    }

    // kill pointers
    DERIVATIVE_INSTALLER.derivative = null;
    DERIVATIVE_INSTALLER.allProperties = null;
    DERIVATIVE_INSTALLER.computedProperties = null;

  }

  /**
   * Used as Proxy "get" handler during dependency installation for computed properties (Derivatives)
   * @function dependencyGetInterceptor
   * @param {object} target - The Installer Object (proxy)
   * @param {string} sourceProperty - The property name that is being intercepted.
   * @external {object} DERIVATIVE_INSTALLER - Derivative installer payload object that is reused throughout the library.
   */
  function dependencyGetInterceptor(target, sourceProperty) {

    /**
     * @external {object} DERIVATIVE_INSTALLER
     * @property {object} derivative - The currently installing derivative
     * @property {object} allProperties - config.props object containing both normal properties AND computed properties.
     * @property {object} computedProperties - module.computed properties. Map of vDerivatives
     */
    const {
      derivative,
      allProperties,
      computedProperties
    } = DERIVATIVE_INSTALLER;

    if (!allProperties.hasOwnProperty(sourceProperty)) {
      throw new Error(`Unable to resolve dependency "${sourceProperty}" of computed prop "${derivative.ownPropertyName}".`);
    }

    // add the property as a sourceProperty to the derivative
    if (derivative.sourceProperties.indexOf(sourceProperty) === -1) {
      derivative.sourceProperties.push(sourceProperty);
    }

    // if the sourceProperty is a derivative itself
    if (computedProperties.has(sourceProperty)) {

      const SourceDerivative = computedProperties.get(sourceProperty);

      if (SourceDerivative.subDerivatives.indexOf(derivative) === -1) {
        SourceDerivative.subDerivatives.push(derivative);
      }

      if (derivative.superDerivatives.indexOf(SourceDerivative) === -1) {
        derivative.superDerivatives.push(SourceDerivative);
      }

    }

  }

  /**
   * Traverses derivatives to flag the deepest observed derivative in a computation branch.
   * This allows me to to stop propagation of computations at the deepest occurring observer
   * and never recompute derivatives that are either unobserved or are an ancestor dependency of
   * an eventually unobserved child derivative.
   * @function setEndOfPropagationInBranchOf
   * @param {object} derivative - The Root Derivative from which we start walking.
   * @param {number} direction - The traversal direction indicating whether we should walk up or down.
   * */
  function setEndOfPropagationInBranchOf(derivative, direction) {
    if (direction === TRAVERSE_DOWN) {
      unflagAllSuperDerivativesOf(derivative); // unflag anything upwards of derivative
      flagDeepestObservedSubDerivativesOf(derivative); // flag deepest observed sub-derivative (can be self)
    } else if (direction === TRAVERSE_UP) {
      flagClosestObservedSuperDerivativesOf(derivative); // find closest observed superDerivatives (if any)
    }
  }

  function unflagAllSuperDerivativesOf(derivative) {
    if (derivative.superDerivatives.length) {
      for (let i = 0, superDerivative; i < derivative.superDerivatives.length; i++) {
        superDerivative = derivative.superDerivatives[i];
        superDerivative.stopPropagation = false;
        if (superDerivative.superDerivatives.length) {
          unflagAllSuperDerivativesOf(superDerivative);
        }
      }
    }
  }

  function flagDeepestObservedSubDerivativesOf(derivative, inclusive = true) {
    derivative.stopPropagation = inclusive; // can be self
    if (derivative.subDerivatives.length) {
      for (let i = 0, subDerivative; i < derivative.subDerivatives.length; i++) {
        subDerivative = derivative.subDerivatives[i];
        if (subDerivative.observers.length) {
          derivative.stopPropagation = false;
          flagDeepestObservedSubDerivativesOf(subDerivative);
        }
      }
    }
  }

  function flagClosestObservedSuperDerivativesOf(derivative, inclusive = false) {
    derivative.stopPropagation = inclusive; // self
    for (let i = 0, superDerivative; i < derivative.superDerivatives.length; i++) {
      superDerivative = derivative.superDerivatives[i];
      if (superDerivative.observers.length) {
        superDerivative.stopPropagation = true;
      } else {
        flagClosestObservedSuperDerivativesOf(superDerivative);
      }
    }
  }
  /**
   * Intercept "get" requests of properties in a reactive state object.
   * When prop is special symbol key, interceptor can return special data for recursive access etc.
   * Auto-wraps any sub-objects (Plain Objects and Arrays) into reactive proxies (unless they are the result of a computation).
   * Auto-creates -and caches intercepted array mutator functions when the get request is to an array mutator.
   * @function proxyGetHandler
   * @param   {object}            target  - The state instance from which a property is being requested.
   * @param   {(string|symbol)}   prop    - The property that is being requested.
   * @returns {*}                 value   - Either the plain state value or a special value when get request has been made to an internal symbol.
   */
  function proxyGetHandler(target, prop) {

    const internals = target[__CUE__];

    return prop === __CUE__ ?
      internals :
      prop === 'imports' ?
      internals.imports :
      internals.internalGetters.has(prop) ?
      internals.internalGetters.get(prop)(internals) :
      target[prop];

  }
  /**
   * Intercept "set" requests of properties in a reactive state object.
   * Only sets properties when not currently reacting to state changes. Disallows and console.warns when mutating state inside of reactions.
   * Automatically assigns "parent" and "ownPropertyName" to value if value is a reactive state instance that does not yet have these required properties.
   * Compares new value to cached value before attempting to queue reactions.
   * @function proxySetHandler
   * @param   {object}            target  - The state instance on which a new or existing property is being set.
   * @param   {string}            prop    - The property that is being set.
   * @param   {*}                 value   - The value that is being assigned to target.prop.
   * @returns {(boolean|undefined)}       - True if the set operation has been successful. Undefined if not set.
   */
  function proxySetHandler(target, prop, value) {

    const internals = target[__CUE__];

    if (internals.internalSetters.has(prop)) {
      internals.internalSetters.get(prop)(internals, value);
      return true;
    }

    if (value !== internals.valueCache.get(prop)) {

      if (typeof value === 'object' && value !== null) { // any object

        const subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);

        if (subInternals.mounted === false) { // something that is being set should not be mounted...
          target[prop] = subInternals.proxyState; // attach the proxy
          subInternals.instanceDidMount(target, prop); // mount the value to the target object
          createAndMountSubStates(subInternals); // mount any children of value recursively to their parents.
        } else {
          console.warn(`Can't re-mount previously mounted property "${prop}" to instance of "${internals.module.name}". This feature is not yet available.`);
        }

        internals.propertyDidChange(prop, subInternals.proxyState);
        internals.valueCache.set(prop, subInternals.proxyState);
        react();
        return true;

      } else {

        target[prop] = value;
        internals.propertyDidChange(prop, value);
        internals.valueCache.set(prop, value);
        react();
        return true;

      }

    }

  }

  /**
   * Intercept "delete" requests of properties in a reactive state object
   * @function proxyDeleteHandler
   * @param {object} target         - the state internals from which a property should be deleted.
   * @param {string} prop           - the property that should be deleted from the target.
   * @returns {(boolean|undefined)} - true if property has been deleted, else undefined.
   */
  function proxyDeleteHandler(target, prop) {

    if (target.hasOwnProperty(prop)) {

      const internals = target[__CUE__];
      const value = target[prop];

      const subInternals = value ? value[__CUE__] : undefined;
      if (subInternals) {
        subInternals.instanceWillUnmount();
      }

      delete target[prop];
      internals.valueCache.delete(prop);
      internals.propertyDidChange.call(internals, prop, undefined);
      react();

      return true;

    }

  }

  /**
   * Queues all reactions, derivatives and their subDerivative branch in a single recursive function.
   * This function is used for queueing dependencies whenever we are not in a batch-op situation (like actions) and we don't want to
   * defer dependency traversal until after a batch op has finished.
   * @function cueAll
   * @param {string}  prop            - The property which has been mutated.
   * @param {*}       value           - The result of the mutation.
   * @param {string}  path            - The path of the property relative to the nearest model-based instance.
   * @param {Array}   observers       - Reaction handlers observing the property.
   * @param {Array}   derivatives     - Derivatives that are being derived from the property.
   * @param {boolean} stopPropagation - Whether or not a derivative has been flagged to be the last observed derivative in its dependency branch. Used for recursion.
   */
  function cueAll(prop, value, path, observers, derivatives, stopPropagation) {

    let i, l, item;

    if (observers) {

      // add pairs of unique [reactionHandler, changedValue, changedPropertyPath] to queue
      for (i = 0; i < observers.length; i++) {
        item = observers[i];
        if (MAIN_QUEUE.indexOf(item) === -1) { // TODO: under which circumstances can there be duplicates here?
          MAIN_QUEUE.push(item, value, path);
        }
      }

    }

    if (derivatives && (l = derivatives.length) && stopPropagation === false) {

      // update internal cache of derivatives
      for (i = 0; i < l; i++) {
        derivatives[i].updateProperty(prop, value);
      }

      // recompute value and recurse
      let result;

      for (i = 0; i < l; i++) {

        item = derivatives[i];
        result = item.value; // calls "getter" -> recomputes _value

        if (item.hasChanged) { // has value changed after recomputation -> recurse
          cueAll(item.ownPropertyName, result, item.ownPropertyName, item.observers, item.subDerivatives, item.stopPropagation);
        }

      }

    }

  }

  /**
   * Called when state is mutated in a batch operation. Queues only the immediate reactions and derivatives of a mutated source property.
   * Explicitly collects the immediate derivatives of the mutated source properties on "accumulatedDerivatives" Array
   * so that the queueing of their subDerivatives (their dependency branch) can be deferred until the batch operation has finished.
   * Batch Op is detected -> Mutations call cueImmediate -> batch op finishes -> cueAccumulated is called -> react() is called.
   * @function cueImmediate
   * @external {Array} accumulatedDerivatives - Collects unique derivatives which were affected by source property mutation(s). Queueing of their subDerivatives is deferred.
   */
  function cueImmediate(prop, value, path, observers, derivatives, stopPropagation) {

    let i, reaction, derivative;

    if (observers) {

      for (i = 0; i < observers.length; i++) {
        reaction = observers[i];
        if (MAIN_QUEUE.indexOf(reaction) === -1) {
          MAIN_QUEUE.push(reaction, value, path);
        }
      }

    }

    if (derivatives && stopPropagation === false) {
      for (i = 0; i < derivatives.length; i++) {
        derivative = derivatives[i];
        derivative.updateProperty(prop, value);
        if (accumulatedDerivatives.indexOf(derivative) === -1) {
          accumulatedDerivatives.push(derivative);
        }
      }
    }

  }

  /**
   * Queues the subDerivatives of derivatives which have accumulated during a batch operation.
   * This method is called after a batch operation has finished and is an optimization that prevents unnecessary re-computations
   * of the dependency branch when there is a chance that one or many source properties are changed multiple times during a batch op (like actions).
   * @function cueAccumulated
   * @external {Array} accumulatedDerivatives - Contains unique derivatives which were affected by source property mutation(s). Their subDerivatives have not yet been queued.
   */
  function cueAccumulated() {

    for (let i = 0, derivative, result; i < accumulatedDerivatives.length; i++) {
      derivative = accumulatedDerivatives[i];
      result = derivative.value; // calls "getter" -> recomputes value
      if (derivative.hasChanged) {
        cueAll(derivative.ownPropertyName, result, derivative.ownPropertyName, derivative.observers, derivative.subDerivatives, derivative.stopPropagation);
      }
    }

    // Empty accumulatedDerivatives
    accumulatedDerivatives.splice(0, accumulatedDerivatives.length);

  }

  /**
   * Runs through the Main Queue to execute each collected reaction with each collected observation payload as the first and only argument.
   * Main Queue is emptied after each call to react.
   * @function react
   */
  function react() {

    if (MAIN_QUEUE.length && !isAccumulating) {

      // Queue contains tuples of (handler, value, path) -> call i[0](i[1],[i2]) ie handler(value, path)
      for (let i = 0; i < MAIN_QUEUE.length; i += 3) {
        MAIN_QUEUE[i](MAIN_QUEUE[i + 1], MAIN_QUEUE[i + 2]);
      }

      // Empty the queue.
      MAIN_QUEUE.splice(0, MAIN_QUEUE.length);

    }

  }

  /**
   * Creates a reusable State Module. A module is a blueprint from which factories can create instances of State.
   * When moduleInitializer argument is a function it must be called with "Module" utility object as the first argument to make it available in the returned, public module configuration object.
   * @function buildStateModule
   * @param   {object}            module            - The shared module object to which this function will add static module data (at this point it only contains the name).
   * @param   {(object|function)} moduleInitializer - The module configuration. When it is a function it is called with the "Module" utility object and must return a plain configuration pojo.
   * @returns {object}            module            - The extended module
   */

  function buildStateModule(module, moduleInitializer) {

    // when function, we call it with STATE_MODULE namespace so that the "Module" utility namespace object is publicly available
    const config = isFunction(moduleInitializer) ? moduleInitializer(STATE_MODULE) : moduleInitializer;

    if (!isPlainObject(config)) {
      throw new TypeError(`Can't create State Module "${module.name}" because the config function does not return a plain object.`);
    }

    if (!isPlainObject(config.props)) {
      throw new TypeError(`State Module requires "props" pojo containing default and optional computed properties.`);
    }

    // static module properties
    module.imports = config.imports;
    module.defaults = {};
    module.initialize = NOOP;
    module.consumersOf = new Map();

    // All internal getters (extended below)
    module.internalGetters = new Map([
    ['get', () => retrieveState],
    ['set', () => applyState]
  ]);

    // All internal setters (extended below)
    module.internalSetters = new Map();

    // these have to be installed by each instance of the module on mount.
    module.derivativesToInstall = new Map();
    module.providersToInstall = new Map();

    // 1. Split props into defaults, computed properties and injected properties.
    // Computeds and injected props are being pre-configured here as much as possible to reduce the amount of work we have to do when we're creating instances from this module.

    for (const prop in config.props) {

      const val = config.props[prop];

      if (isFunction(val)) {

        module.derivativesToInstall.set(prop, {
          ownPropertyName: prop,
          computation: val,
          sourceProperties: [],
          subDerivatives: [],
          superDerivatives: []
        });

        module.internalGetters.set(prop, internals => {
          return internals.derivedProperties.get(prop).value;
        });

      } else if (val instanceof ProviderDescription) {
        // We found a property that wants to inject data from a parent state. The source of the requested data is described in the ProviderDescription that was created when the property called Module.inject(...).

        // 1. Extend the providerDescription with the source (we can use this later to avoid an extra loop)
        val.targetModule = module.name;
        val.targetProperty = prop;

        // 2. map the name of the requesting property to the ProviderDescription:
        module.providersToInstall.set(prop, val);
        // We will use this mapping when this module gets instantiated: If this module has write-access to the provider (readOnly = false) we will install a strong pointer to the parent state into the consuming child instance.

        // Now we also have to create the inverse relationship ie. install this module as a consumer of the providing module under the respectively mapped property names.
        // To avoid memory leaks and the need for manual disposing, the approach for the inverse is different: We will not install strong pointers of consuming child instances into providing parent instances.
        // Instead, we create a consumer that has the string name of the module that is consuming from it. At mutation-time a stateInstance will query its underlying module for any consumers and traverse down
        // its object-children and update any instances that match the consumer module description along the way to the furthest leaves.
        referenceConsumer(module.name, prop, val.sourceModule, val.sourceProperty);

        module.internalGetters.set(prop, internals => {
          const rootProvider = internals.providersOf.get(prop);
          return rootProvider.sourceInternals.plainState[rootProvider.sourceProperty];
        });

        if (val.readOnly === false) {

          module.internalSetters.set(prop, (internals, value) => {
            const rootProvider = internals.providersOf.get(prop);
            rootProvider.sourceInternals.proxyState[rootProvider.sourceProperty] = value;
          });

        }

      } else {

        module.defaults[prop] = val;

      }

    }

    // 2. Install dependencies of derivatives by connecting properties
    installDependencies(config.props, module.derivativesToInstall);

    // 2.1 Resolve dependencies and sort derivatives topologically
    module.derivativesToInstall = OrderedDerivatives.from(module.derivativesToInstall);

    // 3. Collect all methods except "initialize"
    for (const prop in config) {

      const val = config[prop];

      if (prop === 'initialize') {

        if (isFunction(val)) {
          module.initialize = val;
        } else {
          throw new TypeError(`"${prop}" is a reserved word for Cue State Modules and must be a function but is of type "${typeof val}"`);
        }

      } else if (isFunction(val)) {

        if (!module.internalGetters.has(prop)) {

          //module.internalGetters.set(prop, function() {
          //  return val;
          //});

          module.internalGetters.set(prop, () => val);

        } else {
          throw new Error(`Module method name "${prop}" clashes with a property from "props" or with a default Cue property ("get" and "set" are reserved properties). Make sure that props and method names are distinct.`);
        }

      }

    }

    return module;

  }

  /**
   * Attaches itself to a reactive state instance under private [__CUE__] symbol.
   * Properties and methods are required for reactivity engine embedded into every Cue State Instance
   */
  class StateInternals {

    constructor(module, type) {

      this.type = type;

      this.valueCache = new Map();

      // Pointer to underlying module (shared by all instances of module)
      this.module = module;
      this.imports = module.imports;
      this.mounted = false;

      this.internalGetters = EMPTY_MAP;
      this.internalSetters = EMPTY_MAP;

    }

    instanceWillUnmount() {
      console.log('[todo: instanceWillUnmount]', this);
    }

    cueConsumers(providerInstance, consumers, prop, value) {

      // Find consumer instances and recurse into each branch

      let key, childState;
      for (key in this.plainState) {

        childState = this.plainState[key];

        if (childState && (childState = childState[__CUE__])) { // property is a child state instance

          let provider;
          for (provider of childState.providersOf.values()) {
            if (provider.sourceInternals === providerInstance && provider.sourceProperty === prop) {
              // this will branch off into its own search from a new root for a new property in case the provided property is passed down at multiple levels in the state tree...
              childState.propertyDidChange.call(childState, provider.targetProperty, value); // continue recursion in this branch
            }
          }

          // even if we did find a match above we have to recurse, potentially creating a parallel search route (if the provided prop is also provided from another upstream state)
          childState.cueConsumers.call(childState, providerInstance, consumers, prop, value);

        }

      }

    }

  }

  class InstanceInternals extends StateInternals {

    constructor(module, type) {
      super(module, type);
    }

    instanceDidMount(parent, ownPropertyName) {

      // ------------------INLINE "SUPER" CALL----------------------

      this.parentInternals = parent[__CUE__];
      let rootInternals = this.parentInternals;
      this.ownPropertyName = ownPropertyName;
      let rootPropertyName = this.ownPropertyName; //something

      // Find the root internals (root !== parent. root is the closest module-based ancestor)
      const pathFromRoot = [];
      while (rootInternals && rootInternals.type !== STATE_TYPE_INSTANCE) {
        rootInternals = rootInternals.rootInternals;
        rootPropertyName = rootInternals.rootPropertyName;
        pathFromRoot.unshift(rootPropertyName);
      }

      this.rootInternals = rootInternals;
      this.rootPropertyName = rootPropertyName;
      this.pathFromRoot = pathFromRoot;
      this.propertyPathPrefix = pathFromRoot.length > 0 ? `${pathFromRoot.join('.')}.` : ''; // note the trailing dot

      // -------------------------------------------------------------

      this.name = this.module.name;

      this.internalGetters = this.module.internalGetters;
      this.internalSetters = this.module.internalSetters;
      this.consumersOf = this.module.consumersOf;
      this.observersOf = new Map(); // 1D map [propertyName -> handler]
      this.derivativesOf = new Map(); // 2D map [propertyName -> 1D array[...Derivatives]]
      this.derivedProperties = new Map(); // 1D map [propertyName -> Derivative]
      this.providersOf = new Map(); // 1D map [ownPropertyName -> provider{sourceInstance: instance of this very class on an ancestor state, sourceProperty: name of prop on source}]

      if (this.module.providersToInstall.size) {
        this.injectProviders();
      }

      if (this.module.derivativesToInstall.size) {
        this.installDerivatives();
      }

      this.mounted = true;
      this.module.initialize.call(this.proxyState, this.initialProps);
      this.initialProps = undefined;

    }

    propertyDidChange(prop, value) {

      const observers = this.observersOf.get(prop);
      const derivatives = this.derivativesOf.get(prop);

      if (observers || derivatives) {
        if (isAccumulating) {
          cueImmediate(prop, value, prop, observers, derivatives, false);
        } else {
          cueAll(prop, value, prop, observers, derivatives, false);
        }
      }

      const consumers = this.consumersOf.get(prop);

      // 2. if the changed property has consumers, find them and recurse
      if (consumers) {
        this.cueConsumers(this, consumers, prop, value, prop);
      }

    }

    injectProviders() {

      let description, sourceModule, sourceProperty, targetModule, targetProperty, rootProvider;
      for (description of this.module.providersToInstall.values()) {

        // only install providers onto children when they are allowed to mutate the providing parent state
        if (description.readOnly === false) {

          sourceModule = description.sourceModule; // the name of the module-based source state that the provided property comes from
          sourceProperty = description.sourceProperty; // the top-level property name on a state instance created from sourceModule.
          targetModule = description.targetModule; // the name of the module that is consuming the property (here its this.module.name!)
          targetProperty = description.targetProperty; // the top-level property name on this instance that is consuming from the parent

          // Traverse through the parent hierarchy until we find the first parent that has been created from a module that matches the name of the providerModule
          let rootInternals = this.rootInternals;

          while (rootInternals && rootInternals.type !== STATE_TYPE_INSTANCE && rootInternals.name !== sourceModule) {
            rootInternals = rootInternals.rootInternals;
          }

          if (rootInternals) { // found a parent instance that matches the consuming child module name

            // now we have to check if the found state instance is the actual source of the provided property or if it is also consuming it from another parent state.
            rootProvider = rootInternals.providersOf.get(sourceProperty);

            if (rootProvider) { // the provider is a middleman that receives the data from another parent.
              rootProvider = getRootProvider(rootProvider);
            } else {
              rootProvider = {
                sourceInternals: rootInternals,
                sourceProperty,
                targetModule,
                targetProperty
              };
            }

            // -> inject the rootProvider. We now have direct access to the data source on a parent, no matter how many levels of indirection the data has taken to arrive here.
            // all get and set requests to this piece of data will be directly forwarded to the source. Forwarded set mutations will recursively traverse back down through the state tree and notify each consumer along the way.
            this.providersOf.set(targetProperty, rootProvider);

          } else {

            // If we traversed until there are no more parents and we haven't found a state created from our providerModule, throw:
            throw new Error(`[${targetModule}]: Can't inject "${targetProperty}" from "${sourceModule}" because it's not an ancestor of the injecting module instance.`);

          }

        }

      }

    }

    installDerivatives() {

      let vDerivative, i, derivative, sourceProperty, dependencies, superDerivative;
      for (vDerivative of this.module.derivativesToInstall.values()) {

        // 3.0 Create Derivative instance
        derivative = new Derivative(vDerivative.ownPropertyName, vDerivative.computation, vDerivative.sourceProperties);

        // 3.1 Install instance as derivedProp
        this.derivedProperties.set(vDerivative.ownPropertyName, derivative);

        // 3.2 Add derivative as derivativeOf of its sourceProperties (dependencyGraph)
        for (i = 0; i < vDerivative.sourceProperties.length; i++) {
          sourceProperty = vDerivative.sourceProperties[i];
          dependencies = this.derivativesOf.get(sourceProperty);
          if (dependencies) {
            dependencies.push(derivative);
          } else {
            this.derivativesOf.set(sourceProperty, [derivative]);
          }
        }

        // 3.3 Enhance Derivative for self-aware traversal
        for (i = 0; i < vDerivative.superDerivatives.length; i++) {
          // because the module derivatives are topologically sorted, we know that the superDerivative is available
          superDerivative = this.derivedProperties.get(vDerivative.superDerivatives[i].ownPropertyName);
          derivative.superDerivatives.push(superDerivative);
          superDerivative.subDerivatives.push(derivative);
        }

        // 3.4 Fill internal cache of Derivative with proxy. (traps will get values from other resolved derivatives and provided props)
        derivative.fillCache(this.proxyState);

      }

    }

    addChangeReaction(property, handler, scope, autorun = true) {

      if (!isFunction(handler)) {
        throw new TypeError(`Property change reaction for "${property}" is not a function...`);
      }

      const boundHandler = handler.bind(scope);

      if (this.observersOf.has(property)) {
        this.observersOf.get(property).push(boundHandler);
      } else {
        this.observersOf.set(property, [boundHandler]);
      }

      if (this.derivedProperties.has(property)) {
        const derivative = this.derivedProperties.get(property);
        derivative.observers.push(boundHandler);
        setEndOfPropagationInBranchOf(derivative, TRAVERSE_DOWN);
      }

      if (autorun === true) {
        const val = this.proxyState[property];
        boundHandler(val, property);
      }

      return boundHandler;

    }

    removeChangeReaction(property, handler) {

      if (this.observersOf.has(property)) {

        const reactions = this.observersOf.get(property);
        const derivative = this.derivedProperties.get(property);

        if (handler === undefined) {

          this.observersOf.delete(property);

          if (derivative) {
            derivative.observers.splice(0, derivative.observers.length);
            setEndOfPropagationInBranchOf(derivative, TRAVERSE_UP);
          }

        } else if (isFunction(handler)) {

          let i = reactions.indexOf(handler);

          if (i > -1) {
            reactions.splice(i, 1);
          } else {
            console.warn(`Can't remove the passed handler from reactions of "${property}" because it is not registered.`);
          }

          if (derivative) {

            i = derivative.observers.indexOf(handler);

            if (i > -1) {
              derivative.observers.splice(i, 1);
              setEndOfPropagationInBranchOf(derivative, TRAVERSE_UP);
            } else {
              console.warn(`Can't remove the passed handler from observers of derived property "${property}" because it is not registered.`);
            }

          }

        }

      } else {
        console.warn(`Can't unobserve property "${property}" because no reaction has been registered for it.`);
      }

    }

  }

  class ExtensionInternals extends StateInternals {

    constructor(module, type) {
      super(module, type);
    }

    instanceDidMount(parent, ownPropertyName) {

      // ------------------INLINE "SUPER" CALL----------------------

      this.parentInternals = parent[__CUE__];
      let rootInternals = this.parentInternals;
      this.ownPropertyName = ownPropertyName;
      let rootPropertyName = this.ownPropertyName; //something

      // Find the root internals (root !== parent. root is the closest module-based ancestor)
      const pathFromRoot = [];
      while (rootInternals && rootInternals.type !== STATE_TYPE_INSTANCE) {
        rootInternals = rootInternals.rootInternals;
        rootPropertyName = rootInternals.rootPropertyName;
        pathFromRoot.unshift(rootPropertyName);
      }

      this.rootInternals = rootInternals;
      this.rootPropertyName = rootPropertyName;
      this.pathFromRoot = pathFromRoot;
      this.propertyPathPrefix = pathFromRoot.length > 0 ? `${pathFromRoot.join('.')}.` : ''; // note the trailing dot

      // -------------------------------------------------------------

      this.internalGetters = ARRAY_MUTATOR_GETTERS;
      this.mounted = true;

    }

    propertyDidChange(prop) {

      // propagate changes to the root instance.

      const root = this.rootInternals;
      const rootProp = this.rootPropertyName;
      const rootVal = root.plainState[rootProp];
      const path = this.propertyPathPrefix + prop;

      // 1. recurse over direct dependencies
      const observers = root.observersOf.get(rootProp);
      const derivatives = root.derivativesOf.get(rootProp);
      if (observers || derivatives) {
        if (isAccumulating) {
          cueImmediate(rootProp, rootVal, path, observers, derivatives, false);
        } else {
          cueAll(rootProp, rootVal, path, observers, derivatives, false);
        }
      }

      // 2. Notify consumers of the property
      const consumers = root.consumersOf.get(rootProp);
      if (consumers) {
        root.cueConsumers.call(root, root, consumers, rootProp, rootVal, path);
      }

    }

  }

  /**
   * Creates a state instance from a data object and a module blueprint. The data is expected to be unique in the state tree (no circular reference).
   * When available, the parent object and the ownPropertyName of the data object on the parent object can be passed.
   * When called from a StateFactory function, props can be passed in so that the internals can later pass those props into the initialize function of the instance.
   * @param {object}          data    - The data that will be turned into a cue state instance.
   * @param {object}          module  - The module blueprint the instance inherits from.
   * @param {number}          type    - Either 1 when state is created from a module or 2 when state is created as a nested sub-state of a module based parent state.
   * @param {(object|null)}   [props] - When this function is called from a StateFactory that received props, we pass those props into the internals so that we can later call a modules initialize method with these props.
   */
  function createState(data, module, type, props) {

    // 1. Attach Internals to "data" under private __CUE__ symbol.
    const internals = data[__CUE__] = type === STATE_TYPE_INSTANCE ? new InstanceInternals(module, type) : new ExtensionInternals(module, type);

    // 2. Wrap "data" into a reactive proxy
    const proxyState = new Proxy(data, {
      get: proxyGetHandler,
      set: proxySetHandler,
      deleteProperty: proxyDeleteHandler
    });

    // 3. Give Internals explicit reference to both the plain "data" and the wrapped proxy
    internals.plainState = data;
    internals.proxyState = proxyState;

    // 4. When called from a StateFactory, pass initial props to Internals
    if (props) internals.initialProps = props;

    // 5. Return
    return internals;

  }

  function createAndMountSubStates(internals) {

    if (isArray(internals.plainState)) {

      for (let i = 0, val; i < internals.plainState.length; i++) {

        val = internals.plainState[i];

        if (typeof val === 'object' && val !== null) {

          val = val[__CUE__] || createState(val, internals.module, STATE_TYPE_EXTENSION, null);

          if (val.mounted === false) {
            internals.plainState[i] = val.proxyState;
            val.instanceDidMount(internals.plainState, i);
          }

          createAndMountSubStates(val);

        }

      }

    } else {

      const keys = oKeys(internals.plainState);

      for (let i = 0, key, val; i < keys.length; i++) {

        key = keys[i];
        val = internals.plainState[key];

        if (typeof val === 'object' && val !== null) {

          val = val[__CUE__] || createState(val, internals.module, STATE_TYPE_EXTENSION, null);

          if (val.mounted === false) {
            internals.plainState[key] = val.proxyState;
            val.instanceDidMount(internals.plainState, key);
          }

          createAndMountSubStates(val);

        }

      }

    }

  }

  /**
   * Creates a function that will run once when a module is first used.
   * It internally creates a StateFactory function for the module that will be called
   * on any subsequent requests. (Lazy instantiation of modules)
   * @function createStateFactoryInitializer
   * @param   {object}            module                  - The shared module object containing static module data (at this point it only contains the name).
   * @param   {(object|function)} initializer             - The second argument passed to public Cue.State function. Can be a config object or a function returning a config object.
   * @returns {function}          StateFactoryInitializer - The self-overwriting function which creates the factory function that will be called in place of itself on any subsequent instantiations of the module.
   */

  function createStateFactoryInitializer(module, initializer) {

    // A function that runs once to initialize itself, then overwrites itself with the factory function it creates for subsequent calls
    return props => {

      // 1. lazily initialize the core state module
      module = buildStateModule(module, initializer);

      // 3. create a state factory function
      const StateFactory = props => {
        // 3.1. Create an object by deep cloning module default data.
        const data = deepClonePlainObject(module.defaults);
        // 3.2. Enhance the cloned data with reactive Cue Internals and return the PROXY STATE object.
        return createState(data, module, STATE_TYPE_INSTANCE, props).proxyState;
      };

      // 4. overwrite this initialization function with the StateFactory for subsequent calls
      CUE_STATE_MODULES.set(name, StateFactory);

      // 5. call the StateFactory and return the result
      return StateFactory(props);

    }

  }

  /**
   * The namespace that is available as "Module" Object in state module registration closures. Contains helpers and plugins.
   * @namespace {object} STATE_MODULE
   * @extends   {object} LIB
   */
  oAssign(STATE_MODULE, {

    /**
     * Import another state module that the current instance can extend itself with.
     * @method
     * @param   {string}    name  - The unique name of the Cue.State module to be imported.
     * @returns {function}  state - The factory function of the imported module.
     */
    import: name => {
      const state = CUE_STATE_MODULES.get(name);
      if (!state) throw new ReferenceError(`Can't import undefined State Module "${name}".`);
      return state;
    },

    /**
     * Inject a property from a parent state into child state props.
     * @method
     * @param   {string} sourcePath                         - the path to the property on the module. ie "MyModule.SubModule.propA" where "MyModule.SubModule" is the module and "propA" the property to inject from that module.
     * @param   {object} [options = {readOnly: false}]      - optional options object that can indicate whether an injected property has both read-write (default) or read-only capabilities.
     * @returns {ProviderDescription}                       - Object describing the relationship between consumers and providers. Reused and enhanced throughout module instantiation cycle.
     */
    inject: (sourcePath, options = {
      readOnly: false
    }) => {
      const fragments = sourcePath.split('.');
      const sourceModule = fragments.slice(0, -1).join('.');
      const sourceProperty = fragments[fragments.length - 1];
      if (!CUE_STATE_MODULES.has(sourceModule)) throw new ReferenceError(`Can't inject "${sourceProperty}" from undefined State Module "${sourceModule}".`);
      return new ProviderDescription(sourceModule, sourceProperty, options.readOnly);
    }

  });

  CUE_API.State = {

    register: (name, moduleInitializer) => {

      if (typeof name !== 'string') {
        throw new TypeError(`Can't create Cue State Module. First argument must be name of type string but is of type "${typeof name}".`);
      } else if (CUE_STATE_MODULES.has(name)) {
        throw new Error(`A State Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
      }

      const module = {
        name
      };
      CUE_STATE_INTERNALS.set(name, module);
      CUE_STATE_MODULES.set(name, createStateFactoryInitializer(module, moduleInitializer));

    },

    isState: x => x && x[__CUE__]

  };

  // Registered UI Components
  const CUE_UI_MODULES = new Map();

  // The helper object available to public component registration closure as "Component".
  // inherits methods and properties from main LIB object and thus has access to plugins and generic utilities
  oAssign(UI_COMPONENT, {

    import: name => {
      const component = CUE_UI_MODULES.get(name);
      if (!component) throw new ReferenceError(`Can't import UI Component because nothing is registered under "${name}".`);
      return component;
    }

  });

  // Library stylesheet that components can write scoped classes to
  const CUE_UI_STYLESHEET = (() => {
    const stylesheet = document.createElement('style');
    stylesheet.id = 'CUE-STYLES';
    document.head.appendChild(stylesheet);
    return stylesheet.sheet;
  })();

  function replaceClassNameInElement(a, b, element) {
    element.classList.replace(a, b);
    for (let i = 0; i < element.children.length; i++) {
      replaceClassNameInElement(a, b, element.children[i]);
    }
  }

  /**
   * Little CSS in JS Utility which scopes the passed styles object to the template element.
   * The rules for this are:
   * - Every template element is assigned a globally unique class name ".cue-uid"
   * - This is required to scope nested elements uniquely to the template container.
   * - All styles that are being specified in the styles object are assumed to target either tag names, classes or ids.
   * - If a template element contains an element with the tag name that matches a specified top-level style, the tag name takes precedence over class names.
   * - Top-level (ie not nested) tag names are scoped to the component by creating CSS rules in the form of ".cue-uid tag {...}"
   * - Top-level class names are scoped to the component in the form of ".cue-uid__className {...}". Note the underline. We do this to avoid overly complex selectors.
   * - CSS Rules can be written in nested SCSS style syntax including nested chaining by inserting "&" before the property name ie "&:hover", "&.active" etc...
   * @param   {object}      styles    - The styles object. Must be a plain object of strings and nested objects containing style rules.
   * @param   {HTMLElement} template  - The template html element. This is the element that is used for cloning instances.
   * @returns {Map}                   - A Map object which contains mapping from original class names to scoped class names (or an empty map)
   */
  function scopeStylesToComponent(styles, template) {

    const classMap = new Map();

    if (!styles) return classMap;

    const scope = `cue-${CUE_UI_STYLESHEET.cssRules.length.toString(36)}`;

    for (const key in styles) {
      insertStyleRule(prepareSelectorName(key, scope, template, classMap), styles[key]);
    }

    template.classList.add(scope);

    classMap.forEach((scopedClassName, originalClassName) => {
      replaceClassNameInElement(originalClassName, scopedClassName, template);
    });

    return classMap;

  }

  function getScopedSelectorName(element, scope, selector, classMap) {
    if (element.getElementsByTagName(selector).length) {
      return `.${scope} ${selector}`;
    } else if (selector[0] === '#') {
      return selector;
    } else {
      selector = selector.replace('.', '');
      return `.${classMap.set(selector, `${selector}__${scope}`).get(selector)}`;
    }
  }

  function prepareSelectorName(key, scope, template, classMap) {

    if (key.indexOf(',') > -1) {

      const selectors = key.split(',');
      const scopedSelectors = [];

      for (let i = 0; i < selectors.length; i++) {
        scopedSelectors.push(getScopedSelectorName(template, scope, selectors[i], classMap));
      }

      return scopedSelectors.join(', ');

    } else {

      return getScopedSelectorName(template, scope, key, classMap);
    }

  }

  function insertStyleRule(selectorName, styleProperties) {

    let prop;

    let variables = ''; // variables have to be in the rule at insertion time or they wont work.
    for (prop in styleProperties) {

      if (prop.indexOf('--', 0) === 0) {
        variables += `${prop}: ${styleProperties[prop]}; `;
        delete styleProperties[prop];
      }

    }

    const ruleIndex = CUE_UI_STYLESHEET.insertRule(`${selectorName} { ${variables} } `, CUE_UI_STYLESHEET.cssRules.length);
    const styleRule = CUE_UI_STYLESHEET.cssRules[ruleIndex].style;

    for (prop in styleProperties) {

      if (styleProperties[prop].constructor === OBJ) {

        if (prop[0] === '&') {
          insertStyleRule(`${selectorName}${prop.substring(1)}`, styleProperties[prop]);
        } else {
          insertStyleRule(`${selectorName} ${prop}`, styleProperties[prop]);
        }

      } else {

        styleRule[prop] = styleProperties[prop];

      }

    }

  }

  function scopeKeyframesToComponent(keyframes) {

    const map = new Map();
    if (!keyframes) return map;

    let name, uniqueName, framesIndex, framesSheet, frames, percent, index, style;

    for (name in keyframes) {

      uniqueName = createUID(name);

      framesIndex = CUE_UI_STYLESHEET.insertRule(`@keyframes ${uniqueName} {}`, CUE_UI_STYLESHEET.cssRules.length);
      framesSheet = CUE_UI_STYLESHEET.cssRules[framesIndex];

      frames = keyframes[name];

      for (percent in frames) {
        framesSheet.appendRule(`${percent}% {}`);
        index = framesSheet.cssRules.length - 1;
        style = framesSheet.cssRules[index].style;
        oAssign(style, frames[percent]);
      }

      map.set(name, uniqueName);

    }

    return map;

  }

  function createTemplateRootElement(x) {

    if (typeof x === 'string') {

      x = x.trim();

      switch (x[0]) {
        case '<':
          return document.createRange().createContextualFragment(x).firstChild;
        case '.':
          return document.getElementsByClassName(x.substring(1))[0];
        case '#':
          return document.getElementById(x.substring(1));
        case '[':
          return document.querySelectorAll(x)[0];
        default:
          throw new TypeError(`Can't create template from string because it's not html markup or a valid selector.`);
      }

    } else if (x instanceof Element) {

      return x;

    }

  }

  function reconcile(parentElement, currentArray, newArray, createFn, updateFn) {

    // optimized array reconciliation algorithm based on the following implementations
    // https://github.com/localvoid/ivi
    // https://github.com/adamhaile/surplus
    // https://github.com/Freak613/stage0

    let prevStart = 0,
      newStart = 0;
    let loop = true;
    let prevEnd = currentArray.length - 1,
      newEnd = newArray.length - 1;
    let a, b;
    let prevStartNode = parent.firstChild,
      newStartNode = prevStartNode;
    let prevEndNode = parent.lastChild,
      newEndNode = prevEndNode;
    let afterNode;

    // scan over common prefixes, suffixes, and simple reversals
    outer: while (loop) {

      loop = false;

      let _node;

      // Skip prefix
      a = currentArray[prevStart];
      b = newArray[newStart];

      while (a === b) {

        updateFn(prevStartNode, b);

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

        updateFn(prevEndNode, b);

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
        updateFn(prevEndNode, b);

        _node = prevEndNode.previousSibling;
        parent.insertBefore(prevEndNode, newStartNode);
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

        updateFn(prevStartNode, b);

        _node = prevStartNode.nextSibling;
        parent.insertBefore(prevStartNode, afterNode);
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
            parent.removeChild(prevEndNode);
          } else {
            next = prevEndNode.previousSibling;
            parent.removeChild(prevEndNode);
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
            ?
            parent.insertBefore(createFn(newArray[newStart]), afterNode) :
            parent.appendChild(createFn(newArray[newStart]));
          newStart++
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

    let reusable = 0,
      toRemove = [];

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

      parent.textContent = '';

      for (i = newStart; i <= newEnd; i++) {
        parent.appendChild(createFn(newArray[i]));
      }

      return;

    }

    // Full Patch around longest increasing sub-sequence
    const snake = longestIncreasingSubsequence(positions, newStart);

    // gather nodes
    const nodes = [];
    let tmpC = prevStartNode;

    for (i = prevStart; i <= prevEnd; i++) {
      nodes[i] = tmpC;
      tmpC = tmpC.nextSibling
    }

    for (i = 0; i < toRemove.length; i++) {
      parent.removeChild(nodes[toRemove[i]]);
    }

    let snakeIndex = snake.length - 1,
      tempNode;
    for (i = newEnd; i >= newStart; i--) {

      if (snake[snakeIndex] === i) {

        afterNode = nodes[positions[snake[snakeIndex]]];
        updateFn(afterNode, newArray[i]);
        snakeIndex--;

      } else {

        if (positions[i] === -1) {
          tempNode = createFn(newArray[i]);
        } else {
          tempNode = nodes[positions[i]];
          updateFn(tempNode, newArray[i]);
        }

        parent.insertBefore(tempNode, afterNode);
        afterNode = tempNode;

      }

    }

  }

  function longestIncreasingSubsequence(ns, newStart) {

    // inline-optimized implementation of longest-positive-increasing-subsequence algorithm
    // https://en.wikipedia.org/wiki/Longest_increasing_subsequence

    const seq = [];
    const is = [];
    const pre = new Array(ns.length);

    let l = -1,
      i, n, j;

    for (i = newStart; i < ns.length; i++) {

      n = ns[i];

      if (n < 0) continue;

      let lo = -1,
        hi = seq.length,
        mid;

      if (hi > 0 && seq[hi - 1] <= n) {

        j = hi - 1;

      } else {

        while (hi - lo > 1) {

          mid = FLOOR((lo + hi) / 2);

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

  function installStateReactions(component, reactions) {

    const stateInternals = component.state[__CUE__];

    let prop, boundHandler;

    for (prop in reactions) {

      boundHandler = stateInternals.addChangeReaction.call(stateInternals, prop, reactions[prop], component, component.autorun);

      // TODO: not sure what we need this for
      if (component.reactions.has(prop)) {
        component.reactions.get(prop).push(boundHandler);
      } else {
        component.reactions.set(prop, [boundHandler]);
      }

    }

  }

  function bindComponentEvents(component, events) {

    let eventName, value;
    for (eventName in events) {

      value = events[eventName];

      if (component.events.has(eventName)) { // base event already registered

        addHandlerToBaseEvent(component.events.get(eventName), value, component);

      } else { // register new base event

        const eventStack = [];
        component.events.set(eventName, eventStack);
        addHandlerToBaseEvent(eventStack, value, component);

        component.element.addEventListener(eventName, e => {
          for (let i = 0; i < eventStack.length; i++) eventStack[i].call(component, e);
        });

      }

    }

  }

  function addHandlerToBaseEvent(eventStack, handlerOrDelegate, scope) {
    if (isFunction(handlerOrDelegate)) {
      eventStack.push(handlerOrDelegate);
    } else if (isObjectLike(handlerOrDelegate)) {
      for (const selector in handlerOrDelegate) eventStack.push(e => e.target.closest(selector) && handlerOrDelegate[selector].call(scope, e));
    }
  }

  // Cue UI Component Instance available as "this" in component lifecycle methods.
  // Provides access to the raw dom element, imports, keyframes and styles
  // Don't refactor to Pojo (used for instanceof checks)
  const ComponentInstance = wrap(() => {

    const doc = document;
    const isNodeListProto = NodeList.prototype.isPrototypeOf;
    const isHTMLCollectionProto = HTMLCollection.prototype.isPrototypeOf;

    const transitionEventTypes = (() => {

      const el = doc.createElement('tst'),
        ts = {
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

      for (const t in ts)
        if (el.style[t]) return ts[t];

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

          switch (x[0]) {
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

      setChildren(node, {
        from = [],
        to,
        create,
        update = NOOP
      }) {

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
          for (let i = 0; i < to.length; i++) {
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

        const parent = node.parentNode,
          children = parent.children;

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

  function initializeUIComponent(initializer) { // runs only once per module

    // componentInitializer can be function or plain config object (pre-checked for object condition in "registerUIModule")
    const config = typeof initializer === 'function' ? initializer.call(null, UI_COMPONENT) : initializer;

    if (!isPlainObject(config)) {
      throw new TypeError(`Can't create UI Module because the configuration function did not return a plain object.`);
    }

    if (!config.template) {
      throw new TypeError(`UI Module requires "template" property that specifies a DOM Element. // expect(template).toEqual(HTMLString || Selector || DOMNode).`);
    }

    const templateNode = createTemplateRootElement(config.template);

    // automatically scope classNames or keyframes to the component by replacing their names with unique names.
    // functions return a map of the original name to the unique name or an empty map if no component-level styles/keyframes exist.
    const styles = scopeStylesToComponent(config.styles, templateNode);
    const keyframes = scopeKeyframesToComponent(config.keyframes);

    // rewrite delegated event selectors to internally match the scoped classNames
    if (config.bindEvents && styles.size > 0) {
      let eventName, x, selector, scopedSelector;
      for (eventName in config.bindEvents) {
        x = config.bindEvents[eventName];
        if (isObjectLike(x)) { // event type has sub-selectors
          for (selector in x) {
            if (selector[0] === '.') {
              scopedSelector = styles.get(selector.substring(1));
              if (scopedSelector) {
                x['.' + scopedSelector] = x[selector]; // swap .scoped/.unscoped in-place
                delete x[selector];
              }
            }
          }
        }
      }
    }

    return {
      template: templateNode,
      imports: config.imports || null,
      styles: styles,
      keyframes: keyframes,
      initialize: config.initialize || null,
      bindEvents: config.bindEvents || null,
      renderState: config.renderState || null
    };

  }

  function createComponentFactory(initializer) {

    let component = null;

    return state => {

      // lazily initialize the component
      component || (component = initializeUIComponent(initializer));

      // create new UI Component Instance
      const instance = new ComponentInstance(
        component.template.cloneNode(true),
        component.imports,
        component.styles,
        component.keyframes
      );

      // 1. Initialize
      if (component.initialize) {
        component.initialize.call(instance, state);
      }

      // 2. Render State
      if (component.renderState) {
        installStateReactions(instance, component.renderState);
      }

      // 3. Bind Events
      if (component.bindEvents) {
        bindComponentEvents(instance, component.bindEvents);
      }

      // return dom element for compositing
      return instance.element;

    };

  }

  CUE_API.UI = {

    register: (name, componentInitializer) => {

      if (typeof name !== 'string') {
        throw new TypeError(`Can't create Cue-UI Module. First argument must be name of type string but is of type "${typeof name}".`);
      } else if (!componentInitializer || (typeof componentInitializer !== 'function' && !isPlainObject(componentInitializer))) {
        throw new TypeError(`Can't create Cue-UI Module. Second argument must be module initializer function or configuration object but is of type "${typeof componentInitializer}".`);
      } else if (CUE_UI_MODULES.has(name)) {
        throw new Error(`A UI Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
      }

      const ComponentFactory = createComponentFactory(componentInitializer);

      CUE_UI_MODULES.set(name, ComponentFactory);

      return ComponentFactory;

    },

    isComponent: x => x instanceof ComponentInstance

  };

  // Plugin Repository
  const CUE_PLUGINS = new Map();

  const PLUGIN_EXTENSION_POINTS = {
    core: LIB,
    state: STATE_MODULE,
    ui: UI_COMPONENT
  };

  // Internal Methods
  const isPluginNameValid = name => typeof name === 'string' && name.length > 2 && name.indexOf('-') !== -1;

  const parsePluginName = name => name.split('-');

  const installPlugin = (plugin, options) => {

    if (plugin.didInstall) {
      return plugin.extensionPoint;
    }

    // Plugins can be extended by other plugins by declaring extension points via the return value from their install function:
    plugin.extensionPoint = plugin.installer.call(null, PLUGIN_EXTENSION_POINTS, options);
    plugin.didInstall = true;

    return plugin.extensionPoint;

  };

  CUE_API.Plugin = {

    register: (name, installer, autoinstall) => {

      if (!isPluginNameValid(name)) {
        throw new Error(`Plugin must be defined with a namespaced-name (vendor-plugin) of type string as the first argument.`);
      }

      // split name into vendor, Plugin
      const [vendor, plugin] = parsePluginName(name);

      if (!installer && !autoinstall) { // return Plugin interface when only name is provided (Handle Plugin() call like getter)

        const byVendor = CUE_PLUGINS.get(vendor);

        if (byVendor) {

          const thePlugin = byVendor.get(plugin);

          if (thePlugin) {
            return thePlugin;
          } else {
            throw new Error(`No Plugin with name ${name} has been registered under "${vendor}".`);
          }

        } else {
          throw new Error(`No Plugin has been registered under "${byVendor}".`);
        }

      } else { // register a new Plugin when all arguments are provided (like setter)

        if (typeof installer !== 'function') {
          throw new Error(`Plugin must be defined with an installable function as the second argument.`);
        }

        const byVendor = CUE_PLUGINS.get(vendor) || CUE_PLUGINS.set(vendor, new Map()).get(vendor);

        if (byVendor.has(plugin)) {
          console.warn(`A plugin with name "${plugin}" has already been registered under "${vendor}". Skipping installation...`);
          return byVendor.get(plugin).name;
        }

        const thePlugin = {
          installer: installer,
          didInstall: false,
          name: name,
          extensionPoint: undefined
        };

        byVendor.set(plugin, thePlugin);

        if (autoinstall) {
          installPlugin(thePlugin);
        }

        // Return just the name token to store it in constants and pass it around the system.
        return name;

      }

    },

    use: (pluginName, options) => {

      if (!isPluginNameValid(pluginName)) {
        throw new Error(`pluginName must be a namespaced-string (vendor-plugin).`);
      }

      const [vendor, plugin] = parsePluginName(pluginName);

      const byVendor = CUE_PLUGINS.get(vendor);

      if (byVendor) {

        const thePlugin = byVendor.get(plugin);

        if (thePlugin) {
          return installPlugin(thePlugin, options);
        }

      }

      throw new Error(`No Plugin has been registered under "${pluginName}".`);

    }

  };

  class CueComposite {

    constructor(config) {

      if (!isObjectLike(config)) throw new TypeError('Cue config must be an object.');

      this.stateModule = config.state;
      this.stateInstance = null;
      this.stateInternals = null;

      this.uiComponent = config.ui;
      this.uiElement = null;

      this.mounted = false;

    }

    mount(target, props = undefined) {

      if (this.mounted === true) throw new Error('Cue instance already mounted.');

      // Assign / Register the State Module
      let stateModuleName;
      if (typeof this.stateModule === 'string') {
        stateModuleName = this.stateModule;
      } else if (typeof this.stateModule === 'function' || typeof this.stateModule === 'object') {
        stateModuleName = createUID('cue_module');
        CUE_API.State.register(stateModuleName, this.stateModule);
      }

      // Assign / Register the UI Component
      let uiComponentName;
      if (typeof this.uiComponent === 'string') {
        uiComponentName = this.uiComponent;
      } else if (typeof this.uiComponent === 'function' || typeof this.uiComponent === 'object') {
        uiComponentName = createUID('cue_component');
        CUE_API.UI.register(uiComponentName, this.uiComponent);
      }

      const stateFactory = STATE_MODULE.import(stateModuleName);
      const uiFactory = UI_COMPONENT.import(uiComponentName);

      // Parse the Target UI Element
      target = typeof target === 'string' ? document.querySelector(target) : target instanceof Element ? target : undefined;
      if (!target) throw new TypeError(`Target must be a valid DOM Element or DOM Selector String.`);

      // Create State Instance (this returns a proxy)
      const stateInstance = this.stateInstance = stateFactory(props);
      const stateInternals = this.stateInternals = stateInstance[__CUE__];

      stateInternals.instanceDidMount(CUE_ROOT_STATE, stateModuleName);

      // Create UI Element and append it to the target
      const uiElement = this.uiElement = uiFactory(stateInstance);
      target.appendChild(uiElement);

      this.mounted = true;

      return this;

    }

    unmount() {

      if (this.mounted === false) {
        throw new Error(`Can't unmount Cue instance because it has not been mounted.`);
      }

      this.uiElement.parentElement.removeChild(this.uiElement);

      this.uiElement = null;
      this.stateInstance = null;
      this.stateInternals = null;

      this.mounted = false;

      return this;

    }

    getState(asJSON) {
      if (!this.stateInstance) {
        throw new ReferenceError(`State can't be "${typeof this.stateInstance}" when getting it. Mount the Cue Instance first.`);
      } else {
        return this.stateInternals.proxyState['get'](asJSON);
      }
    }

    setState(props) {
      if (!this.stateInstance) {
        throw new ReferenceError(`State can't be "${typeof this.stateInstance}" when setting it. Mount the Cue Instance first.`);
      } else {
        this.stateInternals.proxyState['set'](props);
      }

      return this;

    }

  }

  /**@external global - "this" context passed into the surrounding IIFE that the framework is embedded in. global === window in browser environment./

  /**
   * The global Cue namespace. When called as a function it creates a composable Cue Composite by gluing a rootState to a rootUI.
   * @namespace {function}  Cue
   * @param     {object}    config - Configuration Object that specifies a "state" and a "ui" property. The values are names of State Module and UI Component to be instantiated at the root of the Cue instance.
   * @returns   {object}           - A Cue Composite instance that can be mounted to / unmounted from the live DOM or another Cue Composite.
   */
  const Cue = global.Cue = config => new CueComposite(config);

  Object.defineProperties(Cue, {

    on: {
      value: CUE_API.EventBus.on
    },

    once: {
      value: CUE_API.EventBus.once
    },

    off: {
      value: CUE_API.EventBus.off
    },

    trigger: {
      value: CUE_API.EventBus.trigger
    },

    Plugin: {
      value: CUE_API.Plugin.register
    },

    usePlugin: {
      value: CUE_API.Plugin.use
    },

    State: {
      value: CUE_API.State.register
    },

    isState: {
      value: CUE_API.State.isState
    },

    UI: {
      value: CUE_API.UI.register
    },

    isComponent: {
      value: CUE_API.UI.isComponent
    }

  });

  Cue.Plugin('cue-math', Library => {

    // Math Helpers
    const MTH = Math;
    const MAX = MTH.max;
    const MIN = MTH.min;
    const RANDOM = MTH.random;
    const ABS = MTH.abs;
    const POW = MTH.pow;
    const ROUND = MTH.round;
    const FLOOR = MTH.floor;
    const CEIL = MTH.ceil;
    const PI = MTH.PI;
    const DEG2RAD = PI / 180;
    const RAD2DEG = 180 / PI;

    return Library.core.Math = {

      clamp(min, max, val) {
        return MAX(min, MIN(max, val));
      },

      lerp(from, to, x) {
        return (1 - x) * from + x * to;
      },

      smoothStep(min, max, val) {
        if (val <= min) return 0;
        if (val >= max) return 1;
        val = (val - min) / (max - min);
        return val * val * (3 - 2 * val);
      },

      translate(sourceMin, sourceMax, targetMin, targetMax, x) {
        return targetMin + (x - sourceMin) * (targetMax - targetMin) / (sourceMax - sourceMin);
      },

      createTranslator(sourceMin, sourceMax, targetMin, targetMax) {
        // creates runtime optimized linear range interpolation functions for static ranges
        if (sourceMin === 0 && targetMin > 0) return val => ((val * (targetMax - targetMin)) / sourceMax) + targetMin;
        if (targetMin === 0 && sourceMin > 0) return val => (((val - sourceMin) * targetMax) / (sourceMax - sourceMin));
        if (sourceMin === 0 === targetMin) return val => (val * targetMax) / targetMax;
        return this.translate;
      },

      convertBits(sourceBits, targetBits, val) {
        if (sourceBits < 32) {
          if (targetBits < 32) {
            return val * POW(2, targetBits) / POW(2, sourceBits);
          } else {
            return val / POW(2, sourceBits);
          }
        } else {
          if (targetBits < 32) {
            return ROUND(val * POW(2, targetBits));
          } else {
            return val;
          }
        }
      },

      randomIntBetween(min, max) {
        return FLOOR(RANDOM() * (max - min + 1) + min);
      },

      randomFloatBetween(min, max) {
        return RANDOM() * (max - min) + min;
      },

      isOdd(val) {
        return val & 1;
      },

      isEven(val) {
        return !(val & 1);
      },

      degreesToRadians(degrees) {
        return degrees * DEG2RAD;
      },

      radiansToDegrees(radians) {
        return radians * RAD2DEG;
      },

      scale(numericArray, targetLength) {

        // 1D Linear Interpolation
        const il = numericArray.length - 1,
          ol = targetLength - 1,
          s = il / ol;

        let i, a = 0,
          b = 0,
          c = 0,
          d = 0;

        for (i = 1; i < ol; i++) {
          a = i * s;
          b = FLOOR(a);
          c = CEIL(a);
          d = a - b;
          numericArray[i] = numericArray[b] + (numericArray[c] - numericArray[b]) * d;
        }

        numericArray[ol] = numericArray[il];

        return this;

      },

      closest(numericArray, val) {
        return numericArray.reduce((prev, cur) => (ABS(cur - val) < ABS(prev - val) ? cur : prev));
      },

      smallest(numericArray) {
        let min = Infinity;
        for (let i = 0; i < numericArray.length; i++) {
          if (numericArray[i] < min) min = numericArray[i];
        }
        return min === Infinity ? void 0 : min;
      },

      largest(numericArray) {
        let max = -Infinity;
        for (let i = 0; i < numericArray.length; i++) {
          if (numericArray[i] > max) max = numericArray[i];
        }
        return max === -Infinity ? void 0 : max;
      }

    };

  }, true);

  Cue.Plugin('cue-string', Library => {

    return Library.core.String = {

      createUID() {

        const letters = 'abcdefghijklmnopqrstuvwxyz';

        let sessionCounter = 0;

        return ((this.createUID = function createUID() {

          let n, o = '';
          const alphaHex = sessionCounter.toString(26).split('');
          while ((n = alphaHex.shift())) o += letters[parseInt(n, 26)];
          sessionCounter++;
          return o;

        }).call(this));

      },

      toCamelCase(dashed_string) {
        const c = document.createElement('div');
        c.setAttribute(`data-${dashed_string}`, '');
        return oKeys(c.dataset)[0];
      },

      toDashedCase(camelString) {
        const c = document.createElement('div');
        c.dataset[camelString] = '';
        return c.attributes[0].name.substr(5);
      }

    };

  }, true);

  Cue.Plugin('cue-array', Library => {

    const isArray = Array.isArray;

    return Library.core.Array = {

      flatten(nDimArray) {
        return nDimArray.reduce((x, y) => x.concat(isArray(y) ? this.flatten(y) : y), []);
      },

      insertEveryNth(array, item, n) {
        let i = array.length;
        while (--i > 0)
          if (i % n === 0) array.splice(i, 0, item);
        return this;
      },

      removeEveryNth(array, n) {
        let i = array.length;
        while (--i)
          if (i % n === 0) array.splice(i, 1);
        return this;
      },

      removeRange(array, from, to) {
        array.splice(from, to - from);
        return this;
      },

      merge(target, ...sources) {

        let i, k, s;
        for (i = 0; i < sources.length; i++) {
          s = sources[i];
          for (k = 0; k < s.length; k++) {
            target.push(s[k]);
          }
        }

        return this;

      }

    };

  }, true);

  Cue.Plugin('cue-equality', Library => {

    const Obj = Object;
    const isArray = Array.isArray;

    return Obj.assign(Library.core, {

      isEqual(a, b, deep = false) {

        if (a === b) return true;

        if (a && b && typeof a === 'object' && typeof b === 'object') {

          // Plain Objects (ordered) [fast-path]
          const objA = a.constructor === Obj;
          const objB = b.constructor === Obj;
          if (objA !== objB) return false;
          if (objA && objB) return this.arePlainObjectsEqual(a, b, deep);

          // Arrays (ordered)
          const arrayA = isArray(a);
          const arrayB = isArray(b);
          if (arrayA !== arrayB) return false;
          if (arrayA && arrayB) return this.areArraysEqual(a, b, deep);

          // Maps (ordered)
          const mapA = a instanceof Map;
          const mapB = b instanceof Map;
          if (mapA !== mapB) return false;
          if (mapA && mapB) return this.areMapsEqual(a, b, deep);

          // Sets (ordered)
          const setA = a instanceof Set;
          const setB = b instanceof Set;
          if (setA !== setB) return false;
          if (setA && setB) return this.areSetsEqual(a, b, deep);

          // Dates
          const dateA = a instanceof Date;
          const dateB = b instanceof Date;
          if (dateA !== dateB) return false;
          if (dateA && dateB) return a.getTime() === b.getTime();

          // Regexp
          const regexpA = a instanceof RegExp;
          const regexpB = b instanceof RegExp;
          if (regexpA !== regexpB) return false;
          if (regexpA && regexpB) return a.toString() === b.toString();

          // Other Objects [deferred]
          return this.arePlainObjectsEqual(a, b, deep);

        }

        // Primitives strictly compared
        return a !== a && b !== b;

      },

      areArraysEqual(a, b, deep = false) {

        if (a.length !== b.length) return false;

        for (let i = 0; i < a.length; i++) {
          if (!this.isEqual(a[i], b[i], deep)) {
            return false;
          }
        }

        return true;

      },

      arePlainObjectsEqual(a, b, deep = false) {

        const keysA = oKeys(a);
        const keysB = oKeys(b);

        if (keysA.length !== keysB.length) return false;

        for (let i = 0, k; i < keysA.length; i++) {
          k = keysA[i];
          if (keysB.indexOf(k) === -1 || !this.isEqual(a[k], b[keysB[i]], deep)) {
            return false;
          }
        }

        return true;

      },

      areMapsEqual(a, b, deep = false) {

        if (a.size !== b.size) return false;

        const arrA = Array.from(a);
        const arrB = Array.from(b);

        for (let i = 0, iA, iB; i < arrA.length; i++) {
          iA = arrA[i];
          iB = arrB[i];
          if (iA[0] !== iB[0] || !this.isEqual(iA[1], iB[1], deep)) {
            return false;
          }
        }

        return true;

      },

      areSetsEqual(a, b, deep = false) {

        if (a.size !== b.size) return false;

        const arrA = Array.from(a);
        const arrB = Array.from(b);

        for (let i = 0; i < arrA.length; i++) {
          if (!this.isEqual(arrA[i], arrB[i], deep)) {
            return false;
          }
        }

        return true;

      }

    });

  }, true);

  Cue.Plugin('cue-clone', Library => {

    const Obj = Object;
    const ObjToString = Obj.prototype.toString;
    const ObjID = '[object Object]';
    const isObjectLike = o => typeof o === 'object' && o !== null;

    const isArray = Array.isArray;
    const getProto = Object.getPrototypeOf;

    return Obj.assign(Library.core, {

      clone(o, deep = false) {

        if (isArray(o)) return this.cloneArray(o, deep);

        if (isObjectLike(o)) {

          if (ObjToString.call(o) === ObjID || getProto(o) === null) return this.clonePlainObject(o, deep);
          if (o instanceof Map) return this.cloneMap(o, deep);
          if (o instanceof Set) return this.cloneSet(o, deep);
          if (o instanceof Date) return new Date(o.getTime());
          if (o instanceof RegExp) return RegExp(o.source, o.flags);

        }

        throw new TypeError(`Can't clone non-object, null or undefined."`);

      },

      cloneArray(a, deep = false) {

        if (deep) {

          const clone = [];

          for (let i = 0, v; i < a.length; i++) {
            v = a[i];
            clone.push(isObjectLike(v) ? this.clone(v, deep) : v);
          }

          return clone;

        } else {

          return a.slice();

        }

      },

      clonePlainObject(o, deep = false) {

        if (deep) {

          const clone = {};

          let k, v;
          for (k in o) {
            v = o[k];
            clone[k] = isObjectLike(v) ? this.clone(v, deep) : v;
          }

          return clone;

        } else {

          return Obj.assign({}, o);

        }

      },

      cloneMap(m, deep = false) {

        const clone = new Map();

        if (deep) {
          m.forEach((val, key) => clone.set(isObjectLike(key) ? this.clone(key, deep) : key, isObjectLike(val) ? this.clone(val, deep) : val));
        } else {
          m.forEach((val, key) => clone.set(key, val));
        }

        return clone;

      },

      cloneSet(s, deep = false) {

        const clone = new Set();
        s.forEach(entry => clone.add(deep && isObjectLike(entry) ? this.clone(entry, deep) : entry));
        return clone;

      }

    });

  }, true);

  Cue.Plugin('cue-fn', Library => {

    return Library.core.Function = {

      throttle(func, rate = 250, scope = null) {

        // returns a function that will only be called every "rate" milliseconds

        let now = 0.00,
          last = 0.00;

        return function(...rest) {
          now = Date.now();
          if (now > last + rate) {
            func.apply(scope, rest);
            last = now;
          }
        };

      },

      defer(func, delay = 250, scope = null) {

        // returns a function that is only called "delay" milliseconds after its last invocation

        let pending = null;

        return function(...rest) {
          clearTimeout(pending);
          pending = setTimeout(() => {
            func.apply(scope, rest);
            pending = null;
          }, delay);
        };

      },

      createTaskWorker(handler) {

        // Run processes in a different thread. Use postMessage interface in handler to call back to main thread.
        // handler = function || object: {process: worker.onmessage fn, response: how the workers response is handled on the main thread, onError: ...}
        //
        // Example:
        // const worker = createTaskWorker({
        //   process: function({data}) { <- useful convention to destructure the event object as we're mainly interested in the data
        //     this computation runs in worker thread. can work with data provided by main thread.
        //     postMessage(data.toString()); <- this is passed to the response handler on the main thread via event.data
        //   },
        //   response: function({data}) {
        //     runs on main thread in response to postMessage call from worker thread.
        //     log(typeof data);
        //   }
        // });
        //
        // Start the worker:
        // worker.process(1.234); // -> logs 'string'

        const process = typeof handler === 'function' ? handler : handler.process ? handler.process : undefined;

        const worker = new Worker(window.URL.createObjectURL(new Blob([
        `(function() { onmessage = ${process.toString()} })()`
      ], {
          type: 'application/javascript'
        })));

        if (handler.response) worker.onmessage = handler.response;
        if (handler.onError) worker.onerror = handler.onError;

        return {
          process: worker.postMessage.bind(worker), // starts the worker process
          terminate: worker.terminate.bind(worker), // terminates the worker
          set response(fn) { // defines main-thread response handler for worker
            worker.onmessage = fn;
          },
          get response() {
            return worker.onmessage;
          },
          set onError(fn) { // defines main-thread error handler for worker
            worker.onerror = fn;
          },
          get onError() {
            return worker.onerror;
          }
        };

      }

    };

  }, true);
}(window || this));