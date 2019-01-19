(function(global) {

  /*
   *
   * 🍑 Cue.js - Data Driven UI
   *
   * @author Jonathan M. Ochmann for color.io
   * Copyright 2019 Patchflyer GmbH
   *
   */

  const _CUE_VERSION_ = 0.9;

  // Cue Scoped Utils and Helpers (available anywhere in the Library)
  const NOOP = () => {};

  // All mutating array methods
  const ARRAY_MUTATORS = new Set(['copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift']);

  // Builtins
  const OBJ = Object;
  const ARR = Array;
  const MTH = Math;

  // Static Object/Array Helpers
  const oAssign = OBJ.assign;
  const oCreate = OBJ.create;
  const oDefineProperty = OBJ.defineProperty;
  const oDefineProperties = OBJ.defineProperties;
  const oSetPrototypeOf = OBJ.setPrototypeOf;
  const oKeys = OBJ.keys;
  const oEntries = OBJ.entries;
  const isArray = ARR.isArray;

  // Static Math Helpers
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

  // Reflect methods
  const _set = Reflect.set;
  const _get = Reflect.get;
  const _apply = Reflect.apply;
  const _delete = Reflect.deleteProperty;

  // Generic Cue Prototype Object.
  // Extension point for Plugins and Module specific prototypes.
  const CUE_LIB.core = {};

  oAssign(CUE_LIB.core, {

    clamp(min, max, val) {
      return MAX(min, MIN(max, val));
    },

    lerp(from, to, proportionFloat) {
      return (1 - proportionFloat) * from + proportionFloat * to;
    },

    smoothStep(min, max, val) {
      if (val <= min) return 0;
      if (val >= max) return 1;
      val = (val - min) / (max - min);
      return val * val * (3 - 2 * val);
    },

    interpolateLinear(aMin, aMax, bMin, bMax, val) {
      return bMin + (val - aMin) * (bMax - bMin) / (aMax - aMin);
    },

    createLinearInterpolator(aMin, aMax, bMin, bMax) {

      // creates runtime optimized linear range interpolation functions for static ranges

      if (!arguments.length) {

        return this.interpolateLinear;

      } else {

        if (aMin === 0 && bMin > 0) {

          return val => ((val * (bMax - bMin)) / aMax) + bMin;

        } else if (bMin === 0 && aMin > 0) {

          return val => (((val - aMin) * bMax) / (aMax - aMin));

        } else if (aMin === 0 && bMin === 0) {

          return v => (v * bMax) / bMax;

        } else {

          return this.interpolateLinear;

        }

      }

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

    randomIntegerBetween(min, max) {
      return FLOOR(RANDOM() * (max - min + 1) + min);
    },

    randomFloatBetween(min, max) {
      return RANDOM() * (max - min) + min;
    },

    isOddNumber(val) {
      return val & 1;
    },

    isEvenNumber(val) {
      return !(val & 1);
    },

    degreesToRadians(degrees) {
      return degrees * DEG2RAD;
    },

    radiansToDegrees(radians) {
      return radians * RAD2DEG;
    }

  });

  oAssign(CUE_LIB.core, {

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

    camelCase(dashed_string) {
      const c = document.createElement('div');
      c.setAttribute(`data-${dashed_string}`, '');
      return oKeys(c.dataset)[0];
    },

    dashedCase(camelString) {
      const c = document.createElement('div');
      c.dataset[camelString] = '';
      return c.attributes[0].name.substr(5);
    }

  });

  oAssign(CUE_LIB.core, {

    deepClone(o) {

      // Deep cloning for plain Arrays and Objects

      if (isArray(o)) {

        const clone = [];

        for (let i = 0, v; i < o.length; i++) {
          v = o[i];
          clone[i] = typeof v === 'object' ? this.deepClone(v) : v;
        }

        return clone;

      }

      if (o.constructor === OBJ) {

        const clone = {};

        let i, v;

        for (i in o) {
          v = o[i];
          clone[i] = typeof v === 'object' ? this.deepClone(v) : v;
        }

        return clone;

      }

    },

    shallowClone(o) {

      // Shallow cloning for plain Arrays and Objects

      if (isArray(o)) {
        return o.slice();
      }

      if (o.constructor === OBJ) {
        return oAssign({}, o);
      }

    },

    deepCompare(a, b) {

      // deeply compares primitives, plain arrays && plain objects by content value
      // does not work for functions and object types other than plain old objects and arrays!

      if (a === b) { // primitive value or pointer is equal

        return true;

      } else {

        const typeA = typeof a;

        if (typeA === typeof b) { // same type (can be object and array!)

          const bIsArray = isArray(b);

          if (isArray(a) && bIsArray) { // array::array

            if (a.length !== b.length) { // length mismatch
              return false;
            } else {
              for (let i = 0; i < a.length; i++) {
                if (!this.deepCompare(a[i], b[i])) return false;
              }
              return true;
            }

          } else if (typeA === 'object' && !bIsArray) { // object::object

            let k;
            for (k in a) {
              if (!this.deepCompare(a[k], b[k])) return false;
            }
            return true;

          } else { // object::array || array::object

            return false;

          }

        } else { // type mismatch

          return false;

        }

      }

    },

    shallowCompare(a, b) {

      // One-level shallow, ordered equality check

      // Plain Objects
      if (a.constructor === OBJ && b.constructor === OBJ) {

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

      // Plain Arrays
      if (isArray(a) && isArray(b)) {

        if (a.length !== b.length) {
          return false;
        }

        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) {
            return false;
          }
        }

        return true;

      }

      // Primitives, Maps, Sets, Data, RegExp and other Objects
      // limited to strict equality comparison
      return a === b;

    },

    mergeObjects(...objects) {

      // merge multiple objects into first object

      let i = 0,
        l = objects.length,
        key = '';

      while (++i < l) {
        for (key in objects[i]) {
          if (objects[i].hasOwnProperty(key)) {
            objects[0][key] = objects[i][key];
          }
        }
      }

      return objects[0];

    }

  });

  oAssign(CUE_LIB.core, {

    flattenArray(multiDimensionalArray) {
      return multiDimensionalArray.reduce((x, y) => x.concat(isArray(y) ? this.flattenArray(y) : y), []);
    },

    insertAtEvery(array, item, step) {

      // Insert an item every step items.
      step = MAX(step, 1);

      const sl = array.length; // source length
      const tl = FLOOR(sl + (sl / step)); // target length
      const cl = FLOOR(tl / step); // target chunk length

      let newArray = [];

      for (let x = 0; x < cl; x++) {

        if (newArray.length + step < tl) {

          for (let y = 0; y < step; y++) {
            newArray.push(array[y + (x * step)]);
          }

          newArray.push(item);

        } else {

          const tail = MAX(tl - newArray.length, 0);
          newArray = newArray.concat(array.slice(sl - tail, sl + 1));
          break;

        }

      }

      array = newArray;

      return this;

    },

    removeAtEvery(array, step) {
      let i = FLOOR(array.length / step);
      while (i--) array.splice((i + 1) * step - 1, 1);
      return this;
    },

    removeRangeFromArray(array, from, to) {
      array.splice(from, to - from);
      return this;
    },

    mergeArrays(array1, array2, at = array1.length) {

      at = MIN(MAX(at, 0), array1.length);

      const il = array2.length;
      const tl = array1.length - at;
      const tail = new Array(tl);

      let i;
      for (i = 0; i < tl; i++) tail[i] = array1[i + at];
      for (i = 0; i < il; i++) array1[i + at] = array2[i];
      for (i = 0; i < tl; i++) array1[i + il + at] = tail[i];

      return this;

    },

    scaleArray(array, targetLength) {

      // 1D Linear Interpolation
      const il = array.length - 1,
        ol = targetLength - 1,
        s = il / ol;

      let a = 0,
        b = 0,
        c = 0,
        d = 0;

      for (let i = 1; i < ol; i++) {
        a = i * s;
        b = FLOOR(a);
        c = CEIL(a);
        d = a - b;
        array[i] = array[b] + (array[c] - array[b]) * d;
      }

      array[ol] = array[il];

      return this;

    },

    closestValueInArray(array, val) {
      // get closest match to value in array
      return array.reduce((prev, curr) => {
        return (ABS(curr - val) < ABS(prev - val) ? curr : prev);
      });
    },

    closestSmallestValueInArray(array, value) {
      const closest = this.closestValueInArray(array, value);
      return value >= closest ? closest : array[array.indexOf(closest) - 1];
    },

    closestLargestValueInArray(array, value) {
      const closest = this.closestValueInArray(array, value);
      return value <= closest ? closest : array[array.indexOf(closest) + 1];
    },

    largestValueInArray(array) {
      let max = -Infinity;
      for (let i = 0; i < array.length; i++) {
        if (array[i] > max) max = array[i];
      }
      return max === -Infinity ? void 0 : max;
    },

    smallestValueInArray(array) {
      let min = Infinity;
      for (let i = 0; i < array.length; i++) {
        if (array[i] < min) min = array[i];
      }
      return min === Infinity ? void 0 : min;
    }

  });

  oAssign(CUE_LIB.core, {

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
      //     console.log(typeof data);
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

  });

  const CUE_EVENT_BUS_API = {};

  { // Cue Event Bus

    const CUE_EVENTS = new Map();
    const CUE_EVENTS_ARGS_ERROR = `Can't add listener because the provided arguments are invalid.`;

    let _type, _handler, _scope, _events, _event, _disposable = [];

    const addEvent = (type, handler, scope, once) => {

      const event = {
        handler: handler,
        scope: scope,
        once: once
      };

      if (CUE_EVENTS.has(type)) {
        CUE_EVENTS.get(type).push(event);
      } else {
        CUE_EVENTS.set(type, [event]);
      }

    };

    const addEvents = (events, scope, once) => {

      for (_type in events) {

        _handler = events[_type];

        if (typeof _handler === 'function') {
          addEvent(_type, _handler, scope, once);
        } else {
          throw new TypeError(`Can't add listener because handler for "${_type}" is not a function but of type ${typeof _handler}`);
        }

      }

    };

    // Public API
    oAssign(CUE_EVENT_BUS_API, {

      on: (type, handler, scope) => {

        if (type && type.constructor === OBJ) {
          _scope = typeof handler === 'object' ? handler : null;
          addEvents(type, _scope, false);
        } else if (typeof type === 'string' && typeof handler === 'function') {
          _scope = typeof scope === 'object' ? scope : null;
          addEvent(type, handler, _scope, false);
        } else {
          throw new TypeError(CUE_EVENTS_ARGS_ERROR);
        }

      },

      once: (type, handler, scope) => {

        if (type && type.constructor === OBJ) {
          _scope = typeof handler === 'object' ? handler : null;
          addEvents(type, _scope, true);
        } else if (typeof type === 'string' && typeof handler === 'function') {
          _scope = typeof scope === 'object' ? scope : null;
          addEvent(type, handler, _scope, true);
        } else {
          throw new TypeError(CUE_EVENTS_ARGS_ERROR);
        }

      },

      off: type => {
        CUE_EVENTS.delete(type);
      },

      trigger: (type, ...payload) => {

        if ((_events = CUE_EVENTS.get(type))) {

          for (let i = 0; i < _events.length; i++) {
            _event = _events[i];
            _event.handler.apply(_event.scope, payload);
            if (_event.once) _disposable.push(_event);
          }

          if (_disposable.length) {
            CUE_EVENTS.set(type, _events.filter(event => _disposable.indexOf(event) === -1));
            _disposable.length = 0;
          }

          _events = null;

        }

      }

    });

  }

  // Plugin Repository
  const CUE_PLUGINS = new Map();

  // Internal Methods
  const isPluginNameValid = name => typeof name === 'string' && name.length > 2 && name.indexOf('-') !== -1;

  const parsePluginName = name => name.split('-');

  const installPlugin = (plugin, options) => {

    if (plugin.didInstall) {
      console.warn(`"${plugin.name}" has already been installed. Installation ignored.`);
      return plugin.interface;
    }

    plugin.installer.call(plugin.interface, CUE_LIB.core, options);
    plugin.didInstall = true;
    plugin.interface.onDidInstall.call(plugin.interface, options);

    return plugin.interface;

  };

  const CUE_PLUGINS_API = {

    Plugin: (name, installer, autoinstall) => {

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
          return byVendor.get(plugin).interface;
        }

        const thePlugin = {
          installer: installer,
          didInstall: false,
          name: name,
          interface: {
            name: name,
              onDidInstall() {}
          }
        };

        byVendor.set(plugin, thePlugin);

        return autoinstall ? installPlugin(thePlugin) : thePlugin.interface;

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

  // Registered State Modules
  const CUE_STATE_MODULES = new Map();

  // #State Variables
  let isReacting = false; // is a reaction currently in process?
  let isAccumulating = false; // are we accumulating observers and derivatives because a change is part of a multi-property-change action?

  // Global derivative installer payload
  const DERIVATIVE_INSTALLER = {
    derivative: null,
    allProperties: null,
    derivedProperties: null
  };

  // Traversal Directions
  const TRAVERSE_DOWN = -1;
  const TRAVERSE_UP = 1;

  // Meta Keys used for closure scope lookup && safely extending foreign objects
  const __CUE__ = Symbol('🍑');
  const __TARGET__ = Symbol('Target Object');
  const __INTERCEPTED_METHODS__ = Symbol('Intercepted Methods');

  // Reaction Queue
  const MAIN_QUEUE = [];

  // Cue-State Prototype Object extends Cue-Prototype Object
  const CUE_LIB.state = oCreate(CUE_LIB.core, {

    import: {
      value: function(name) {
        const state = CUE_STATE_MODULES.get(name);
        if (!state) throw new ReferenceError(`Can't import State Module because nothing is registered under "${name}".`);
        return state;
      }
    }

  });

  function appendToArray(target, toAppend) {

    for (let i = 0; i < toAppend.length; i++) {
      target.push(toAppend[i]);
    }

    return target;

  }

  function deepCloneObjectOrArray(o) {

    // Deep cloning for plain Objects and Arrays

    if (o && o.constructor === OBJ) {
      return deepClonePlainObject(o);
    }

    if (isArray(o)) {
      return deepCloneArray(o);
    }

  }

  function deepClonePlainObject(o) {

    const clone = {};

    let i, v;

    for (i in o) {
      v = o[i];
      clone[i] = typeof v === 'object' ? deepCloneObjectOrArray(v) : v;
    }

    return clone;

  }

  function deepCloneArray(o) {

    const clone = [];

    for (let i = 0, v; i < o.length; i++) {
      v = o[i];
      clone[i] = typeof v === 'object' ? deepCloneObjectOrArray(v) : v;
    }

    return clone;

  }

  function areShallowEqual(a, b) {

    // One-level shallow, ordered equality check
    if (a === b) return true;

    if (a && b && typeof a === 'object' && typeof b === 'object') {

      // Plain Arrays
      const arrayA = isArray(a);
      const arrayB = isArray(b);

      if (arrayA !== arrayB) return false;
      if (arrayA && arrayB) return areArraysShallowEqual(a, b);

      // Plain Objects
      const objA = a.constructor === OBJ;
      const objB = b.constructor === OBJ;

      if (objA !== objB) return false;
      if (objA && objB) return arePlainObjectsShallowEqual(a, b);

    }

    // Primitives, Maps, Sets, Date, RegExp etc strictly compared
    return a !== a && b !== b;

  }

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

  function areArraysShallowEqual(a, b) {

    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;

  }

  // Derived Property Instance
  class Derivative {

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

    get value() {

      // Dynamic getter of value which recomputes only when
      // a direct (shallow) dependency has been previously updated

      if (this.needsUpdate) {

        // recompute
        this.intermediate = this.computation.call(null, this.valueCache);

        // compare to previous value
        if (areShallowEqual(this._value, this.intermediate)) {
          this.hasChanged = false;
        } else {
          this._value = this.intermediate;
          this.hasChanged = true;
        }

        // computation is up to date (until it gets invalidated by changing a dependency again...)
        this.needsUpdate = false;

      }

      return this._value;

    }

    updateProperty(property, value) {
      // update a single dependency of the derivative.
      // the passed value is guaranteed to have changed
      this.valueCache[property] = value;
      // because a dependency has been updated, we need to recompute
      // this.value the next time it is requested.
      this.needsUpdate = true;
    }

    fillCache(source) {
      // pulls in all dependency values from source object
      for (let i = 0, k; i < this.sourceProperties.length; i++) {
        k = this.sourceProperties[i];
        this.valueCache[k] = source[k];
      }
      this.needsUpdate = true;
    }

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

  const OrderedDerivatives = {

    // topological sorter to resolve derivative dependencies
    // returns sorted map

    source: null,
    visited: [],

    from(derivatives) {

      this.source = derivatives;

      const target = new Map();

      for (const sourceProperty of derivatives.keys()) {
        this._visit(sourceProperty, [], target);
      }

      this.source = null;
      this.visited.splice(0, this.visited.length);

      return target;

    },

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

  function installDependencies(props, {
    computed
  }) {

    // set the current installer payload
    oAssign(DERIVATIVE_INSTALLER, {
      allProperties: props,
      derivedProperties: computed
    });

    // intercept get requests to props object to grab sourceProperties
    const installer = new Proxy(props, {
      get: dependencyGetInterceptor
    });

    // call each computation which will trigger the intercepted get requests
    computed.forEach(derivative => {

      DERIVATIVE_INSTALLER.derivative = derivative;

      try {
        // the computation itself will most definitely fail but we only care about the property dependencies so we can safely ignore all errors.
        // #DOC: As a convention, computations should destructure dependencies from first argument instead of dotting into "this" to ensure all dependencies are reached even if computation body contains conditionals.
        derivative.computation.call(installer, installer);
      } catch (e) {}

    });

    // kill pointers
    DERIVATIVE_INSTALLER.derivative = null;
    DERIVATIVE_INSTALLER.allProperties = null;
    DERIVATIVE_INSTALLER.dependencyGraph = null;
    DERIVATIVE_INSTALLER.derivedProperties = null;

  }

  function dependencyGetInterceptor(target, sourceProperty) {

    const {
      derivative,
      allProperties,
      dependencyGraph,
      derivedProperties
    } = DERIVATIVE_INSTALLER;

    if (!allProperties.hasOwnProperty(sourceProperty)) {
      throw new Error(`Unable to resolve dependency "${sourceProperty}" of computed prop "${derivative.ownPropertyName}".`);
    }

    // install the derivative as a dependency of the sourceProperty
    if (dependencyGraph.has(sourceProperty)) {
      dependencyGraph.get(sourceProperty).push(derivative);
    } else {
      dependencyGraph.set(sourceProperty, [derivative]);
    }

    // add the property as a sourceProperty to the derivative
    if (derivative.sourceProperties.indexOf(sourceProperty) === -1) {
      derivative.sourceProperties.push(sourceProperty);
    }

    // if the sourceProperty is a derivative itself
    if (derivedProperties.has(sourceProperty)) {

      const SourceDerivative = derivedProperties.get(sourceProperty);

      if (SourceDerivative.subDerivatives.indexOf(derivative) === -1) {
        SourceDerivative.subDerivatives.push(derivative);
      }

      if (derivative.superDerivatives.indexOf(SourceDerivative) === -1) {
        derivative.superDerivatives.push(SourceDerivative);
      }

    }

  }

  function setEndOfPropagationInBranchOf(derivative, direction) {
    // traverses derivatives to flag the deepest observed derivative in a computation branch.
    // this allows us to stop propagation of computations at the deepest occurring observer
    // and never recompute derivatives that are either unobserved or are an ancestor dependency of an
    // eventually unobserved child derivative.
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

  function createProxy(stateInstance) {

    return new Proxy(stateInstance, {
      get: proxyGetHandler,
      set: proxySetHandler,
      deleteProperty: proxyDeleteHandler
    });

  }

  function proxyGetHandler(target, prop) {

    // never intercept special properties
    if (prop === __CUE__ || prop === __INTERCEPTED_METHODS__) {
      return target[prop];
    }

    if (prop === __TARGET__) {
      return target;
    }

    const value = _get(target, prop);

    if (!value || value[__CUE__]) {
      return value;
    }

    if (isArray(value) || value.constructor === OBJ) {
      return createProxy(StateInternals.assignTo(value, target, prop));
    }

    if (ARRAY_MUTATORS.has(prop) && typeof value === 'function') {

      const cache = target[__INTERCEPTED_METHODS__];
      return cache.get(prop) || (cache.set(prop, createInterceptedArrayMutator(value))).get(prop);

    }

    return value;

  }

  function proxySetHandler(target, prop, value) {

    if (!isReacting) {

      const instance = target[__CUE__];
      const oldValue = instance.valueCache.get(prop);

      if (value) {

        const nestedInstance = value[__CUE__];

        if (nestedInstance && nestedInstance.parent === null) {
          nestedInstance.parent = target;
          nestedInstance.ownPropertyName = prop;
        }

      }

      if (value !== oldValue) {

        let inQueue = instance.attemptCue(prop, value, oldValue);

        if (instance.parent !== null) {
          const oldTarget = isArray(target) ? target.slice() : oAssign({}, target);
          inQueue += instance.parent.attemptCue.call(instance.parent, instance.ownPropertyName, target, oldTarget);
        }

        _set(target, prop, value);
        instance.valueCache.set(prop, value);

        if (inQueue > 0 && !isAccumulating) {
          react();
        }

        return true;

      }

    } else {

      console.warn(`Setting of "${prop}" ignored. Don't mutate state in a reaction. Refactor to computed properties instead.`);

    }

  }

  function proxyDeleteHandler(target, prop) {

    if (!isReacting) {

      if (target.hasOwnProperty(prop)) {

        const instance = target[__CUE__];

        const oldValue = instance.valueCache.get(prop);

        let inQueue = instance.attemptCue(prop, undefined, oldValue);

        if (instance.parent) {
          const oldTarget = isArray(target) ? target.slice() : oAssign({}, target);
          inQueue += instance.parent.attemptCue.call(instance.parent, instance.ownPropertyName, target, oldTarget);
        }

        _delete(target, prop);
        instance.valueCache.delete(prop);

        if (inQueue > 0 && !isAccumulating) {
          react();
        }

        return true;

      }

    } else {

      console.warn(`Deletion of "${prop}" ignored. Don't mutate state in a reaction. Refactor to computed properties instead.`);

    }

  }

  function createInterceptedArrayMutator(nativeMethod) {

    return function(...args) {

      if (!isReacting) {

        const instance = this[__CUE__];
        const target = this[__TARGET__];

        if (instance.parent === null) {
          // no parent to report changes to, exit early.
          return _apply(nativeMethod, target, args);
        }

        const oldTarget = target.slice(); // shallow clone array
        const result = _apply(nativeMethod, target, args); // apply method, potentially mutate target

        if (!areArraysShallowEqual(oldTarget, target)) {
          if (instance.parent.attemptCue.call(instance.parent, instance.ownPropertyName, target, oldTarget)) {
            if (!isAccumulating) {
              react();
            }
          }
        }

        return result;

      } else {

        console.warn(`Array mutation ignored. Don't mutate state in a reaction. Refactor to computed properties instead.`);

      }

    }

  }

  function cueAll(prop, value, oldValue, observers, derivatives, stopPropagation) {

    // Collect observers and derivatives of the changed property and, recursively those of all of it's descendant derivatives

    let i, l, item;

    if (observers) {
      for (i = 0; i < observers.length; i++) {
        item = observers[i];
        if (MAIN_QUEUE.indexOf(item) === -1) {
          MAIN_QUEUE.push(item, {
            property: prop,
            value: value,
            oldValue: oldValue
          });
        }
      }
    }

    if (derivatives && (l = derivatives.length) && stopPropagation === false) {

      // update internal cache of derivatives
      for (i = 0; i < l; i++) {
        derivatives[i].updateProperty(prop, value);
      }

      // recompute value and recurse
      let previous, result;

      for (i = 0; i < l; i++) {

        item = derivatives[i];
        previous = item._value; // uses internal _value
        result = item.value; // calls "getter" -> recomputes _value

        if (item.hasChanged) { // has value changed after recomputation -> recurse
          cueAll(item.ownPropertyName, result, previous, item.observers, item.subDerivatives, item.stopPropagation);
        }

      }

    }

  }

  function cueImmediate(prop, value, oldValue, observers, derivatives, stopPropagation) {

    // Collect immediate observers and derivatives of the changed property. Don't recurse over sub-derivatives just yet.

    let i, item;

    if (observers) {
      for (i = 0; i < observers.length; i++) {
        item = observers[i];
        if (MAIN_QUEUE.indexOf(item) === -1) {
          MAIN_QUEUE.push(item, {
            property: prop,
            value: value,
            oldValue: oldValue
          });
        }
      }
    }

    if (derivatives && stopPropagation === false) {
      for (i = 0; i < derivatives.length; i++) {
        derivatives[i].updateProperty(prop, value);
      }
    }

  }

  function cueAccumulated(derivatives) {

    for (let i = 0, item, previous, result; i < derivatives.length; i++) {
      item = derivatives[i];
      previous = item._value; // internal
      result = item.value; // calls "getter" -> recomputes value
      if (item.hasChanged) {
        cueAll(item.ownPropertyName, result, previous, item.observers, item.derivatives, item.stopPropagation);
      }
    }

  }

  function react() {

    isReacting = true;

    const l = MAIN_QUEUE.length;

    // MAIN_QUEUE contains pairs of i: reactionHandler(), i+1: payload{property, value, oldValue}
    for (let i = 0; i < l; i += 2) {
      MAIN_QUEUE[i](MAIN_QUEUE[i + 1]);
    }

    // empty the queue
    MAIN_QUEUE.splice(0, l);

    isReacting = false;

  }

  class StateInternals {

    static assignTo(stateInstance, parent, ownPropertyName) {
      stateInstance[__CUE__] = new this(parent, ownPropertyName);
      return stateInstance;
    }

    constructor(parent = null, ownPropertyName = '') {

      this.parent = parent;
      this.ownPropertyName = ownPropertyName;

      this.isInitializing = false;

      this.valueCache = new Map();
      this.observersOf = new Map();
      this.derivativesOf = new Map();
      this.derivedProperties = new Map();

    }

    addChangeReaction(property, handler, scope = null) {

      if (typeof handler !== 'function') {
        throw new TypeError(`Property change reaction for "${property}" is not a function...`);
      }

      const _handler = scope === null ? handler : handler.bind(scope);

      if (this.observersOf.has(property)) {
        this.observersOf.get(property).push(_handler);
      } else {
        this.observersOf.set(property, [_handler]);
      }

      if (this.derivedProperties.has(property)) {
        const derivative = this.derivedProperties.get(property);
        derivative.observers.push(_handler);
        setEndOfPropagationInBranchOf(derivative, TRAVERSE_DOWN);

      }

      return _handler;

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

        } else if (typeof handler === 'function') {

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

    attemptCue(prop, value, oldValue) {

      const drv = this.derivativesOf.get(prop);
      const obs = this.observersOf.get(prop);

      if (drv || obs) {

        if (isAccumulating) {
          cueImmediate(prop, value, oldValue, obs, drv, false);
        } else {
          cueAll(prop, value, oldValue, obs, drv, false);
        }

        return 1;

      } else {

        return 0;

      }

    }

  }

  function createStateInstance(type, factory, module, _parent, _ownPropertyName) {

    // 1. Create base instance
    const instance = type === 'object' ?
      oAssign(oCreate(factory.prototype), deepClonePlainObject(module.defaults)) :
      appendToArray(oSetPrototypeOf([], factory.prototype), deepCloneArray(module.defaults));

    // 2. Assign Internals (__CUE__)
    const internal = instance[__CUE__] = new StateInternals(_parent, _ownPropertyName);

    // 3. Create Derivatives from module blueprints
    let i, derivative, sourceProperty, dependencies, superDerivative;
    module.computed.forEach(vDerivative => {

      // 3.0 Create instance
      derivative = new Derivative(vDerivative.ownPropertyName, vDerivative.computation, vDerivative.sourceProperties);

      // 3.1 Install instance as derivedProp
      internal.derivedProperties.set(vDerivative.ownPropertyName, derivative);

      // 3.2 Add derivative as derivativeOf of its sourceProperties (dependencyGraph)
      for (i = 0; i < vDerivative.sourceProperties.length; i++) {
        sourceProperty = vDerivative.sourceProperties[i];
        dependencies = internal.derivativesOf.get(sourceProperty);
        if (dependencies) {
          dependencies.push(derivative);
        } else {
          internal.derivativesOf.set(sourceProperty, [derivative]);
        }
      }

      // 3.3 Enhance Derivative for self-aware traversal
      for (i = 0; i < vDerivative.superDerivatives.length; i++) {
        // because the module derivatives are topologically sorted, we know that the superDerivative is available
        superDerivative = internal.derivedProperties.get(vDerivative.superDerivatives.ownPropertyName);
        derivative.superDerivatives.push(superDerivative);
        superDerivative.subDerivatives.push(derivative);
      }

      // 3.4 Fill internal cache of Derivative
      // (instance inherits from factory.prototype which contains forwarding-getters which trigger value computation in Derivative)
      derivative.fillCache(instance);

    });

    // 4. Return
    return instance;

  }

  function createStateFactory(module) {

    let StateFactory;

    if (isArray(module.defaults)) {

      if (module.static) {

        let statik;

        StateFactory = props => {
          if (module.initialize) {
            statik[__CUE__].isInitializing = true;
            module.initialize.call(statik, props);
            statik[__CUE__].isInitializing = false;
          }
          return statik;
        };

        StateFactory.prototype = oCreate(Array.prototype);

        statik = createProxy(createStateInstance('array', StateFactory, module));

      } else {

        StateFactory = props => {

          const instance = createProxy(createStateInstance('array', StateFactory, module));

          if (module.initialize) {
            instance[__CUE__].isInitializing = true;
            module.initialize.call(instance, props);
            instance[__CUE__].isInitializing = false;
          }

          return instance;

        };

        StateFactory.prototype = oCreate(Array.prototype);

      }

    } else {

      if (module.static) {

        let statik;

        StateFactory = props => {
          if (module.initialize) {
            statik[__CUE__].isInitializing = true;
            module.initialize.call(statik, props);
            statik[__CUE__].isInitializing = false;
          }
          return statik;
        };

        StateFactory.prototype = {};

        statik = createProxy(createStateInstance('object', StateFactory, module));

      } else {

        StateFactory = props => {

          const instance = createProxy(createStateInstance('object', StateFactory, module));

          if (module.initialize) {
            instance[__CUE__].isInitializing = true;
            module.initialize.call(instance, props);
            instance[__CUE__].isInitializing = false;
          }

          return instance;

        };

        StateFactory.prototype = {};

      }

    }

    return StateFactory;

  }

  function extendStateFactoryPrototype(stateFactory, module) {

    // These methods and properties are shared by all instances of
    // a module from the stateFactory's generic prototype object.
    // "this" in the methods refers to the current instance.

    let key;

    // Computed Properties
    for (key in module.computed) {
      oDefineProperty(stateFactory.prototype, key, {
        get() { // forward requests to Derivative.value getter
          return this[__CUE__].derivedProperties.get(key).value;
        },
        configurable: true,
        enumerable: true
      });
    }

    // Actions
    for (key in module.actions) {
      stateFactory.prototype[key] = module.actions[key];
    }

    // Imports
    stateFactory.prototype.imports = module.imports;

    // (private) intercepted method cache
    stateFactory.prototype[__INTERCEPTED_METHODS__] = new Map();

  }

  function initializeStateModule(moduleInitializer) {

    // creates a reusable Module. A Module is a blueprint
    // from which factories can create instances of State.

    const config = typeof moduleInitializer === 'function' ? moduleInitializer(CUE_LIB.state) : moduleInitializer;

    if (!config || config.constructor !== OBJ) {
      throw new TypeError(`Can't create State Module because the config function does not return a plain object.`);
    }

    const type = isArray(config.props) ? 'array' : config.props && config.props.constructor === OBJ ? 'object' : 'illegal';

    if (type === 'illegal') {
      throw new TypeError(`State Module requires "props" object (plain object or array) containing default and optional computed properties.`);
    }

    const module = {
      defaults: type === 'array' ? [] : {},
      computed: new Map(), // key -> vDerivative (resolved & ordered)
      initialize: undefined,
      actions: {},
      static: config.static === true,
      imports: config.imports,
    };

    // 1. Split props into default and computed properties
    let prop, i, val;
    if (type === 'array') {

      for (i = 0; i < config.props.length; i++) {
        val = config.props[i];
        if (typeof val === 'function') {
          module.computed.set(i, {
            ownPropertyName: i,
            computation: val,
            sourceProperties: [],
            subDerivatives: [],
            superDerivatives: []
          });
        } else {
          module.defaults.push(val);
        }
      }

    } else {

      for (prop in config.props) {

        val = config.props[prop];

        if (typeof val === 'function') {
          module.computed.set(prop, {
            ownPropertyName: prop,
            computation: val,
            sourceProperties: [],
            subDerivatives: [],
            superDerivatives: []
          });
        } else {
          module.defaults[prop] = val;
        }

      }

    }

    // 2. Install dependencies of derivatives by connecting properties
    installDependencies(config.props, module);

    // 3. Resolve dependencies and sort derivatives topologically
    module.computed = OrderedDerivatives.from(module.computed);

    // 4. Collect all methods except "initialize" on action object
    for (prop in config) {

      val = config[prop];

      if (prop === 'initialize') {

        if (typeof val === 'function') {
          module[prop] = val;
        } else {
          throw new TypeError(`"${prop}" is a reserved word for Cue State Modules and must be a function but is of type ${typeof val}`);
        }

      } else if (typeof val === 'function') {

        module.actions[prop] = val;

      }

    }

    return module;

  }

  function createStateFactoryInitializer(name, initializer) {

    return props => {

      // the returned function will run once when the module is first used
      // it internally creates a StateFactory function for the model that is called on
      // any subsequent requests.

      const module = initializeStateModule(initializer);

      // Create a Factory Function that will be used to instantiate the module
      const StateFactory = createStateFactory(module);

      // Add module properties to StateFactory.prototype
      extendStateFactoryPrototype(StateFactory, module);

      // Overwrite this initialization function with the StateFactory
      CUE_STATE_MODULES.set(name, StateFactory);

      // Call the StateFactory
      return StateFactory.call(null, props);

    }

  }

  const CUE_STATE_API = {

    State: (name, moduleInitializer) => {

      if (typeof name !== 'string') {
        throw new TypeError(`Can't create Cue State Module. First argument must be name of type string but is of type "${typeof name}".`);
      } else if (CUE_STATE_MODULES.has(name)) {
        throw new Error(`A State Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
      }

      const StateFactoryInitializer = createStateFactoryInitializer(name, moduleInitializer);

      CUE_STATE_MODULES.set(name, StateFactoryInitializer);

      return StateFactoryInitializer;

    }

  };

  // Registered UI Components
  const CUE_UI_MODULES = new Map();

  // The CUE Proto Object (Inner-API) exposed to Cue.Component registration closures
  // inherits methods and properties from main CUE_LIB.core object and thus has access to plugins and generic utilities
  const CUE_LIB.ui = oCreate(CUE_LIB.core, {

    import: {
      value: function(name) {
        const component = CUE_UI_MODULES.get(name);
        if (!component) throw new ReferenceError(`Can't import UI Component because nothing is registered under "${name}".`);
        return component;
      }
    }

  });

  // Implementation of DOM ClassList that works with mapped classNames
  // Useful when a component has generated unique, component-scoped classNames
  // but we want to work with the user-defined classNames in our high-level code.

  const __mappedClassNames__ = Symbol('ClassName Map');
  const __elementClassList__ = Symbol('Original ClassList');

  class MappedClassList {

    constructor(map, element) {

      if (!map) {
        throw new TypeError(`Can't create MappedClassList. First argument has to be a plain Object, 2D Array or a Map but is ${JSON.stringify(map)}.`);
      } else if (map.constructor === OBJ) {
        map = new Map(oEntries(map));
      } else if (isArray(map)) {
        map = new Map(map);
      }

      // internalize map and original classList
      oDefineProperties(this, {
      [__mappedClassNames__]: {
          value: map
        },
      [__elementClassList__]: {
          value: element.classList // internal reference to original classList.
        }
      });

    }

    item(index) {
      return this[__elementClassList__].item(index);
    }

    contains(token) {
      return this[__elementClassList__].contains(this[__mappedClassNames__].get(token) || token);
    }

    add(token) {
      this[__elementClassList__].add(this[__mappedClassNames__].get(token) || token);
    }

    remove(token) {
      this[__elementClassList__].remove(this[__mappedClassNames__].get(token) || token);
    }

    replace(existingToken, newToken) {
      this[__elementClassList__].replace((this[__mappedClassNames__].get(existingToken) || existingToken), (this[__mappedClassNames__].get(newToken) || newToken));
    }

    toggle(token) {
      this[__elementClassList__].toggle(this[__mappedClassNames__].get(token) || token);
    }

  }

  // Library stylesheet that components can write scoped classes to
  const CUE_UI_STYLESHEET = (() => {
    const stylesheet = document.createElement('style');
    stylesheet.id = 'CUE-STYLES';
    document.head.appendChild(stylesheet);
    return stylesheet.sheet;
  })();

  function createUniqueClassName(name) {

    const letters = 'abcdefghijklmnopqrstuvwxyz';

    let sessionCounter = 0;

    return ((createUniqueClassName = function(name) {

      let n, o = '';
      const alphaHex = sessionCounter.toString(26).split('');
      while ((n = alphaHex.shift())) o += letters[parseInt(n, 26)];
      sessionCounter++;
      return `${name}-${o}`;

    }).call(null, name));

  }

  function replaceClassNameInElement(a, b, element) {
    element.classList.replace(a, b);
    for (let i = 0; i < element.children.length; i++) {
      replaceClassNameInElement(a, b, element.children[i]);
    }
  }

  function scopeStylesToComponent(styles, template) {

    let className, classRules, classRule, pseudoRuleIndex, pseudoRuleStyle, uniqueClassName, ruleIndex, ruleStyle;

    for (className in styles) {

      uniqueClassName = createUniqueClassName(className);

      ruleIndex = CUE_UI_STYLESHEET.insertRule(`.${uniqueClassName} {}`, CUE_UI_STYLESHEET.cssRules.length);
      ruleStyle = CUE_UI_STYLESHEET.cssRules[ruleIndex].style;

      classRules = styles[className];

      for (classRule in classRules) {
        if (classRule[0] === ':' || classRule[0] === ' ') {
          pseudoRuleIndex = CUE_UI_STYLESHEET.insertRule(`.${uniqueClassName}${classRule} {}`, CUE_UI_STYLESHEET.cssRules.length);
          pseudoRuleStyle = CUE_UI_STYLESHEET.cssRules[pseudoRuleIndex].style;
          oAssign(pseudoRuleStyle, classRules[classRule]);
          delete classRules[classRule];
        }
      }

      oAssign(ruleStyle, classRules);
      styles[className] = uniqueClassName;

      if (template) {
        replaceClassNameInElement(className, uniqueClassName, template);
      }

    }

    return styles;

  }

  function scopeKeyframesToComponent(keyframes) {

    let name, uniqueName, framesIndex, framesSheet, frames, percent, index, style;

    for (name in keyframes) {

      uniqueName = createUniqueClassName(name);

      framesIndex = CUE_UI_STYLESHEET.insertRule(`@keyframes ${uniqueName} {}`, CUE_UI_STYLESHEET.cssRules.length);
      framesSheet = CUE_UI_STYLESHEET.cssRules[framesIndex];

      frames = keyframes[name];

      for (percent in frames) {
        framesSheet.appendRule(`${percent}% {}`);
        index = framesSheet.cssRules.length - 1;
        style = framesSheet.cssRules[index].style;
        oAssign(style, frames[percent]);
      }

      keyframes[name] = uniqueName;

    }

    return keyframes;

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

  // Cue UI Component Instance available as "this" in component lifecycle methods.
  // Provides access to the raw dom element, imports, keyframes and styles
  // Exposes shorthands and utility methods that allow for DOM and STATE querying, manipulation and binding.

  class ComponentInstance {

    constructor(element, imports, styles, keyframes) {

      this.element = element;
      this.imports = imports;
      this.keyframes = keyframes;
      this.styles = styles;

      // In case component-scope classes have been generated in a styles object, we map default classNames to unique classNames internally.
      // overwrite element.classList with mapped implementation
      if (styles && oKeys(styles).length) {
        oDefineProperty(element, 'classList', {
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

    setChildren({
      from = [],
      to,
      create,
      update = NOOP
    }) {

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
        this.element.textContent = '';
        return;
      }

      // fast path create all
      if (from.length === 0) {
        for (let i = 0; i < to.length; i++) {
          parent.appendChild(create(to[i]))
        }
        return;
      }

      // reconcile current/new newData arrays
      reconcile(this.element, from, to, create, update);

    }

    observe(state, property, handler, autorun = true) {

      const stateInstance = state[__CUE__];

      if (typeof property === 'string') {

        const boundHandler = stateInstance.addChangeReaction(property, handler, this);

        if (autorun === true) {
          boundHandler({
            property: property,
            value: state[property],
            oldValue: state[property]
          });
        }

        return boundHandler;

      } else if (property.constructor === OBJ && property !== null) {

        const _autorun = typeof handler === 'boolean' ? handler : autorun;
        const boundHandlers = {};

        let prop, boundHandler;

        for (prop in property) {

          boundHandler = stateInstance.addChangeReaction(prop, property[prop], this);

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

    on(type, handler, options) {

      // element.addEventListener convenience method which accepts a plain object of multiple event -> handlers
      // since we're always binding to the root element, we facilitate event delegation. handlers can internally compare e.target to refs or children.

      if (arguments.length === 1 && type && type.constructor === OBJ) {
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

  function initializeUIComponent(initializer) { // runs only once per module

    // componentInitializer can be function or plain config object (pre-checked for object condition in "registerUIModule")
    const CONFIG = typeof initializer === 'function' ? initializer(CUE_LIB.ui) : initializer;

    if (!CONFIG || CONFIG.constructor !== OBJ) {
      throw new TypeError(`Can't create UI Module because the configuration function did not return a plain object.`);
    }

    if (!CONFIG.template) {
      throw new TypeError(`UI Module requires "template" property that specifies a DOM Element. // expect(template).toEqual(HTMLString || Selector || DOMNode).`);
    }

    const templateNode = createTemplateRootElement(CONFIG.template);

    return {
      template: templateNode,
      imports: CONFIG.imports || null,
      styles: CONFIG.styles ? scopeStylesToComponent(CONFIG.styles, templateNode) : null,
      keyframes: CONFIG.keyframes ? scopeKeyframesToComponent(CONFIG.keyframes) : null,
      initialize: CONFIG.initialize || null,
      didMount: CONFIG.didMount || NOOP,
      didUpdate: CONFIG.didUpdate || NOOP,
      willUnmount: CONFIG.willUnmount || NOOP
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

      // initialize
      if (component.initialize) {
        component.initialize.call(instance, state);
      }

      // return dom element for compositing
      return instance.element;

    };

  }

  const CUE_UI_API = {

    UI: (name, componentInitializer) => {

      if (typeof name !== 'string') {
        throw new TypeError(`Can't create Cue-UI Module. First argument must be name of type string but is of type "${typeof name}".`);
      } else if (!componentInitializer || (typeof componentInitializer !== 'function' && componentInitializer.constructor !== Object)) {
        throw new TypeError(`Can't create Cue-UI Module. Second argument must be module initializer function or configuration object but is of type "${typeof componentInitializer}".`);
      } else if (CUE_UI_MODULES.has(name)) {
        throw new Error(`A UI Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
      }

      const ComponentFactory = createComponentFactory(componentInitializer);

      CUE_UI_MODULES.set(name, ComponentFactory);

      return ComponentFactory;

    }

  };

  const CueInstanceProto = {

    mount(target = document.body, props = undefined) {

      if (this.mounted === true) {
        throw new Error('Cue instance already mounted.');
      }

      target = typeof target === 'string' ? document.querySelector(target) : target instanceof Element ? target : null;
      if (!target) throw new TypeError(`Target is not HTMLElement or Selector of element that is in the DOM.`);

      const rootState = CUE_LIB.state.import(this.state.module);
      const rootComponent = CUE_LIB.ui.import(this.ui.component);

      this.state.instance = rootState(props);
      this.ui.element = rootComponent(this.state.instance);

      target.appendChild(this.ui.element);
      this.lifeCycle.didMount.call(this);

      this.mounted = true;

      return this;

    },

    unmount() {

      if (this.mounted === false) {
        throw new Error(`Can't unmount Cue instance because it has not been mounted.`);
      }

      this.lifeCycle.willUnmount.call(this);
      this.ui.element.parentElement.removeChild(this.ui.element);

      this.ui.element = null;
      this.state.instance = null;

      this.mounted = false;

      return this;

    }

  };

  global || (global = window);
  global.Cue = oAssign(function(config) {

      if (!config || config.constructor !== OBJ)
        throw new TypeError('[Cue]: config is not an object.');
      if (typeof config.state !== 'string')
        throw new TypeError(`[Cue]: config.state is "${typeof config.state}" and not a name. Specify the name of a state module to use as the root state for the Cue instance.`);
      if (typeof config.ui !== 'string')
        throw new TypeError(`[Cue]: config.ui is "${typeof config.ui}" and not a name. Specify the name of a ui component to use as the root element for the Cue instance.`);

      return oAssign(oCreate(CueInstanceProto), {
        state: {
          module: config.state,
          instance: null
        },
        ui: {
          component: config.ui,
          element: null
        },
        mounted: false,
        lifeCycle: {
          didMount: config.didMount || NOOP,
          willUnmount: config.willUnmount || NOOP,
        }
      });

    },

    CUE_EVENT_BUS_API,
    CUE_PLUGINS_API,
    CUE_STATE_API,
    CUE_UI_API

  );

  console.log(`%c🍑 Cue.js - Version ${_CUE_VERSION_}`, 'color: rgb(0, 140, 255)');

}(window || this));