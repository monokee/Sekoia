(function(global) {

  /*
   *
   * 🍑 Cue.js - Data Driven UI
   *
   * @author Jonathan M. Ochmann for VisionColor
   * Copyright 2018-2020 Patchflyer GmbH
   *
   */

  const _CUE_VERSION_ = 0.8;
  console.log(`%c🍑 Cue.js - Version ${_CUE_VERSION_}`, 'color: rgb(0, 140, 255)');

  // Global Library Singleton
  const Cue = global.Cue = Object.create(null);

  // Cue Scoped Utils and Helpers (available anywhere in the library)

  // NoOp method
  const NOOP = () => {};

  // All mutating array methods
  const ARRAY_MUTATORS = new Set(['copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift']);

  // Static Object/Array Helpers
  const assign = Object.assign;
  const create = Object.create;
  const defineProperty = Object.defineProperty;
  const defineProperties = Object.defineProperties;
  const objKeys = Object.keys;
  const isArray = Array.isArray;

  // Static Math Helpers
  const MAX = Math.max;
  const MIN = Math.min;
  const RANDOM = Math.random;
  const ABS = Math.abs;
  const POW = Math.pow;
  const ROUND = Math.round;
  const FLOOR = Math.floor;
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  // Reflect methods
  const _set = Reflect.set;
  const _get = Reflect.get;
  const _apply = Reflect.apply;
  const _delete = Reflect.deleteProperty;

  // Main API exposed to Components.
  // Also statically available via global Cue prototype.
  // This is the main extension point for Plugins.
  const CUE_PROTO = Cue.prototype = create(null);

  assign(CUE_PROTO, {

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

  assign(CUE_PROTO, {

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
      return Object.keys(c.dataset)[0];
    },

    dashedCase(camelString) {
      const c = document.createElement('div');
      c.dataset[camelString] = '';
      return c.attributes[0].name.substr(5);
    }

  });

  assign(CUE_PROTO, {

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

      if (o.constructor === Object) {

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

      if (o.constructor === Object) {
        return Object.assign({}, o);
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

          const bIsArray = Array.isArray(b);

          if (Array.isArray(a) && bIsArray) { // array::array

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
      if (a.constructor === Object && b.constructor === Object) {

        const keysA = objKeys(a);
        const keysB = objKeys(b);

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

  assign(CUE_PROTO, {

    flattenArray(multiDimensionalArray) {
      return multiDimensionalArray.reduce((x, y) => x.concat(Array.isArray(y) ? this.flattenArray(y) : y), []);
    },

    insertAtEvery(array, item, step) {

      // Insert an item every step items.
      step = Math.max(step, 1);

      const sl = array.length; // source length
      const tl = Math.floor(sl + (sl / step)); // target length
      const cl = Math.floor(tl / step); // target chunk length

      let newArray = [];

      for (let x = 0; x < cl; x++) {

        if (newArray.length + step < tl) {

          for (let y = 0; y < step; y++) {
            newArray.push(array[y + (x * step)]);
          }

          newArray.push(item);

        } else {

          const tail = Math.max(tl - newArray.length, 0);
          newArray = newArray.concat(array.slice(sl - tail, sl + 1));
          break;

        }

      }

      array = newArray;

      return this;

    },

    removeAtEvery(array, step) {
      let i = Math.floor(array.length / step);
      while (i--) array.splice((i + 1) * step - 1, 1);
      return this;
    },

    removeRangeFromArray(array, from, to) {
      array.splice(from, to - from);
      return this;
    },

    mergeArrays(array1, array2, at = array1.length) {

      at = Math.min(Math.max(at, 0), array1.length);

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
        b = Math.floor(a);
        c = Math.ceil(a);
        d = a - b;
        array[i] = array[b] + (array[c] - array[b]) * d;
      }

      array[ol] = array[il];

      return this;

    },

    closestValueInArray(array, val) {
      // get closest match to value in array
      return array.reduce((prev, curr) => {
        return (Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
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

  assign(CUE_PROTO, {

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

    defineProperties(Cue, {

      on: {

        value: function(type, handler, scope) {

          if (type && type.constructor === Object) {
            _scope = typeof handler === 'object' ? handler : null;
            addEvents(type, _scope, false);
          } else if (typeof type === 'string' && typeof handler === 'function') {
            _scope = typeof scope === 'object' ? scope : null;
            addEvent(type, handler, _scope, false);
          } else {
            throw new TypeError(CUE_EVENTS_ARGS_ERROR);
          }

        }

      },

      once: {

        value: function(type, handler, scope) {

          if (type && type.constructor === Object) {
            _scope = typeof handler === 'object' ? handler : null;
            addEvents(type, _scope, true);
          } else if (typeof type === 'string' && typeof handler === 'function') {
            _scope = typeof scope === 'object' ? scope : null;
            addEvent(type, handler, _scope, true);
          } else {
            throw new TypeError(CUE_EVENTS_ARGS_ERROR);
          }

        }

      },

      off: {

        value: function(type) {
          CUE_EVENTS.delete(type);
        }

      },

      trigger: {

        value: function(type, payload) {

          if ((_events = CUE_EVENTS.get(type))) {

            for (let i = 0; i < _events.length; i++) {
              _event = _events[i];
              _event.handler.call(_event.scope, payload);
              if (_event.once) _disposable.push(_event);
            }

            if (_disposable.length) {
              CUE_EVENTS.set(type, _events.filter(event => _disposable.indexOf(event) === -1));
              _disposable.length = 0;
            }

            _events = null;

          }

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

    plugin.installer.call(plugin.interface, CUE_PROTO, options);
    plugin.didInstall = true;
    plugin.interface.onDidInstall();

    return plugin.interface;

  };

  // Public Plugin API
  defineProperties(Cue, {

    Plugin: {

      value: function(name, installer, autoinstall) {

        if (!isPluginNameValid(name)) {
          throw new Error(`Plugin must be defined with a namespaced-name (vendor-plugin) of type string as the first argument.`);
        }

        // split name into vendor, plugin
        const [vendor, plugin] = parsePluginName(name);

        if (!installer && !autoinstall) { // return plugin interface when only name is provided (like getter)

          const byVendor = CUE_PLUGINS.get(vendor);

          if (byVendor) {

            const thePlugin = byVendor.get(plugin);

            if (thePlugin) {
              return thePlugin;
            }

          }

        } else { // register a new plugin when all arguments are provided (like setter)

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

      }

    },

    use: {

      value: function(pluginName, options) {

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

        throw new Error(`No Plugin registered under "${pluginName}".`);

      }

    }

  });

  // # CUE PUBLIC API:

  // Registered State Modules
  const CUE_STATE_MODULES = new Map();
  // State Module Type Identifier
  const CUE_STATE_TYPE_ID = 'model';

  // # STATE INTERNAL API:

  // #State Variables
  let isReacting = false; // is a reaction currently in process?
  let isAccumulating = false; // are we accumulating observers and derivatives because a change is part of a multi-property-change action?
  let derivativeToConnect = null; // Installer payload for derivatives

  // Helpers
  const createShallowClone = CUE_PROTO.shallowClone;
  const isShallowEqual = CUE_PROTO.shallowCompare;

  // Traversal Directions
  const TRAVERSE_DOWN = -1;
  const TRAVERSE_UP = 1;

  // Meta Keys used for closure scope lookup && safely extending foreign objects
  const _UID_ = Symbol('UniqueID');
  const _IS_OBSERVABLE_ = Symbol('IsValueObservable');
  const _IS_DERIVATIVE_ = Symbol('IsValueDerived');
  const _IS_REACTOR_TARGET_ = Symbol('ReactorTarget');
  const _DISPOSE_REACTOR_ = Symbol('DisposeReactor');

  const _REACTORS_ = Symbol('Reactors');
  const _OBSERVERS_OF_ = Symbol('ObserversOfProperties');
  const _DERIVATIVES_OF_ = Symbol('DerivativesOfProperties');
  const _DERIVED_PROPERTIES_ = Symbol('DerivedProperties');

  const _PARENT_ = Symbol('ParentModel');
  const _OWNPROPERTYNAME_ = Symbol('OwnPropertyName');
  const _SET_PARENT_ = Symbol('SetParent');
  const _GET_OWN_CUER_ = Symbol('GetOwnCue');
  const _SET_PARENT_CUER_ = Symbol('SetParentCue');
  const _SOURCE_DATA_ = Symbol('SourceData');
  const _PROXY_MODEL_ = Symbol('ProxyModel');

  // Root Store
  const STORE = {
    ROOT: undefined
  };

  // Reaction Queue
  const MAIN_QUEUE = [];

  // Cue-State Prototype Object extends Cue-Prototype Object
  const CUE_STATE_PROTO = create(CUE_PROTO, {

    import: {
      value: function(name) {
        const state = CUE_STATE_MODULES.get(name);
        if (!state) throw new ReferenceError(`Can't import State Module because nothing is registered under "${name}".`);
        return state;
      }
    }

  });

  class Observable {

    static create(data, _parent, _ownPropertyName) {
      return data[_IS_OBSERVABLE_] ? data : data[_PROXY_MODEL_] || new this(data, _parent, _ownPropertyName);
    }

    constructor(data, _parent, _ownPropertyName) {

      const uid = this.uid = Symbol();
      const reactors = this.reactors = new Set();
      const observersOf = this.observersOf = new Map();
      const derivativesOf = this.derivativesOf = new Map();
      const derivedProperties = this.derivedProperties = new Map();

      this.fnCache = new Map();
      this.valueCache = new Map();

      if (_parent) {

        this.parent = _parent;
        this.ownPropertyName = _ownPropertyName;

      } else {

        const {
          parent,
          ownPropertyName
        } = findParentAndOwnPropertyName(data, STORE);
        this.parent = parent;
        this.ownPropertyName = ownPropertyName;

      }

      // Has to be arrow function w/o own this binding so it can be shared across scopes.
      this.attemptCue = (type, prop, value, mutationDetails) => {

        const drv = this.derivativesOf.get(prop);
        const obs = this.observersOf.get(prop);

        if (drv || obs) {

          if (isAccumulating) {
            cueImmediate(type, prop, value, mutationDetails, obs, drv, false);
          } else {
            cue(type, prop, value, mutationDetails, obs, drv, false);
          }

          return true;

        } else {

          return false;

        }

      };

      this.attemptCueParent = this.parent[_GET_OWN_CUER_];

      this.metaProperties = new Map([
      [_IS_OBSERVABLE_, true],
      [_SOURCE_DATA_, data],
      [_PARENT_, this.parent],
      [_OBSERVERS_OF_, observersOf],
      [_DERIVATIVES_OF_, derivativesOf],
      [_DERIVED_PROPERTIES_, derivedProperties],
      [_OWNPROPERTYNAME_, this.ownPropertyName],
      [_REACTORS_, reactors],
      [_GET_OWN_CUER_, this.attemptCue],
      [_SET_PARENT_CUER_, value => this.attemptCueParent = value],
      [_SET_PARENT_, value => this.parent = value],
      [_UID_, uid],
    ]);

      this.data = data;

      // We're using "this" as the handler object so that compatible methods are shared in memory
      this.model = new Proxy(data, this);

      // Install any derivatives on the data
      this.setupDerivatives();

      // Establish link to parent object and parent Cue function
      let key, val;
      for (key in data) {
        if ((val = data[key]) && val[_IS_OBSERVABLE_]) {
          val[_SET_PARENT_](this.model);
          val[_SET_PARENT_CUER_](this.attemptCue);
        }
      }

      // decorate the data object with a link to the reactive model
      Object.defineProperty(data, _PROXY_MODEL_, {
        value: this.model,
        configurable: true
      });

      // replace plain data with reactive model on the state tree
      (this.parent[_SOURCE_DATA_] || this.parent)[this.ownPropertyName] = this.model;

      // return the reactive model
      return this.model;

    }

    get(target, prop) {

      // HANDLE DERIVATIVE INSTALLATION
      if (derivativeToConnect !== null) {

        // if the derivative depends on a property that is an "object" and the object is not itself a derivative
        // we have to turn that object into an observable so that it can propagate changes to the derivative
        const dep = _get(target, prop);

        if (typeof dep === 'object' && dep !== null && !dep[_IS_OBSERVABLE_] && !dep[_IS_DERIVATIVE_]) {
          this.constructor.create(dep, target, prop);
        }

        // install it as a derivative of the "gotten" property on the model
        if (this.derivativesOf.has(prop)) {
          this.derivativesOf.get(prop).push(derivativeToConnect);
        } else {
          this.derivativesOf.set(prop, [derivativeToConnect]);
        }

        // add the "gotten" property key to the derivatives' dependencies
        if (derivativeToConnect.dependencies.indexOf(prop) === -1) {
          derivativeToConnect.dependencies.push(prop);
        }

        // if the "gotten" property is a derivative itself, we install the derivativeToConnect
        // as a derivative of the "gotten" derivative, and the "gotten" property as a
        // superDerivative of derivativeToConnect allowing for "self-aware" traversal in both directions.
        const thisDerivative = this.derivedProperties.get(prop);

        if (thisDerivative) {

          if (thisDerivative.derivatives.indexOf(derivativeToConnect) === -1) {
            thisDerivative.derivatives.push(derivativeToConnect);
          }

          if (derivativeToConnect.superDerivatives.indexOf(thisDerivative) === -1) {
            derivativeToConnect.superDerivatives.push(thisDerivative);
          }

        }

        // now all dependencies are established. handshake done. tea time.
        return;

      }

      // HANDLE META PROPERTY ACCESS
      const meta = this.metaProperties.get(prop);
      if (meta) return meta;

      // HANDLE NORMAL GET REQUESTS
      const value = _get(target, prop);

      // RETURN VALUE OR MEMOIZED METHOD
      return typeof value !== 'function' ? value : this.fnCache.get(prop) || (this.fnCache.set(prop, (...args) => {

        // if method is not mutating OR there is no attemptCue function on the parent, return early.
        if (!ARRAY_MUTATORS.has(prop) || !this.attemptCueParent) {
          return _apply(value, target, args);
        }

        // create a shallow clone of the target
        const previous = createShallowClone(target);

        // apply function to and potentially mutate target
        const result = _apply(value, target, args);

        // if properties have been mutated
        if (!isShallowEqual(previous, target)) {

          // if parent is being observed or derived from
          if (this.attemptCueParent('methodCall', this.ownPropertyName, target, {
              method: prop,
              arguments: args,
              result: result
            })) {

            // if we're not accumulating changes
            if (!isAccumulating) {
              react();
            }

          }

        }

        return result;

      })).get(prop);

    }

    set(target, prop, value) {

      if (this.derivedProperties.has(prop)) {
        throw new Error(`Can not set property "${prop}" because it is derived. Derivatives have to be explicitly deleted before they can be redefined.`);
      }

      if (!isReacting && value !== this.valueCache.get(prop)) {

        if (typeof value === 'function') {

          const derivative = this.addDerivative(prop);
          derivative.connect();
          derivative.refreshCache();
          value = derivative.value;

        } else {

          _set(target, prop, value);
          this.valueCache.set(prop, value ? value[_SOURCE_DATA_] || value : value);

        }

        // attemptCue property observers + derivatives + check for required extension
        // Note: "attemptCue" will add existing observers + derivatives to MAIN_QUEUE and return true. if there was nothing to add it returns false
        if (this.attemptCue('set', prop, value, undefined)) {

          if (typeof value === 'object' && value !== null && !value[_IS_OBSERVABLE_] && !value[_IS_DERIVATIVE_]) {
            this.constructor.create(value, target, prop);
          }

          if (this.attemptCueParent) {
            this.attemptCueParent('setChild', this.ownPropertyName, target, {
              childProperty: prop,
              mutationType: 'set'
            });
          }

          if (!isAccumulating) {
            react();
          }

          return true;

        } else if (this.attemptCueParent && this.attemptCueParent('setChild', this.ownPropertyName, target, {
            childProperty: prop,
            mutationType: 'set'
          })) {

          if (!isAccumulating) {
            react();
          }

          return true;

        }

      }

    }

    deleteProperty(target, prop) {

      if (!isReacting) {

        if (this.derivedProperties.has(prop)) {
          this.derivedProperties.get(prop).dispose(true);
        }

        _delete(target, prop);
        this.valueCache.delete(prop);

        this.attemptCue('delete', prop, undefined, undefined);
        this.attemptCueParent && this.attemptCueParent('deleteChild', this.ownPropertyName, target, {
          childProperty: prop,
          mutationType: 'delete'
        });

        if (!isAccumulating) {
          react();
        }

        return true;

      }

    }

    setupDerivatives() {

      const props = Object.keys(this.data);
      const total = props.length;

      let i, k, prop;

      // 1: Create Derivatives + Modify Data
      for (i = 0; i < props.length; i++) {
        // for each (own) function in the data object
        prop = props[i];
        if (this.data.hasOwnProperty(prop) && typeof this.data[prop] === 'function') {
          this.addDerivative(prop);
        }
      }

      if (this.derivedProperties.size === 0) {
        return false;
      }

      // 2: Connect Derivatives.
      // handshake method that sets up the derivative as a derivative of it's
      // model sources and the sources as dependencies on the derivative.
      this.derivedProperties.forEach(derivative => derivative.connect());

      // Next we have to traverse the model and fill the cache of each derivative.
      // Because derivatives can depend on other derivatives, we need this
      // basic tree traversal algorithm that only computes a derived property
      // when all of it's dependencies are marked ready.

      let sourceProp, derivative, sourceDerivative;
      const ready = [];

      // 3: Traverse
      search: while (ready.length < total) { // search entire stack until all derivatives are ready

        for (i = 0; i < total; i++) { // for each property

          prop = props[i];
          derivative = this.derivedProperties.get(prop);

          if (derivative && derivative.readyToInstall === false) { // if property is a pending derivative

            for (k = 0; k < derivative.dependencies.length; k++) { // for each of its source dependencies

              sourceProp = derivative.dependencies[k];
              sourceDerivative = this.derivedProperties.get(sourceProp);

              if (sourceDerivative && sourceDerivative.readyToInstall === false) {
                derivative.readyToInstall = false;
                break;
              } else {
                derivative.readyToInstall = true;
              }

            }

            if (derivative.readyToInstall) {

              // all dependencies of the derivative are now available.
              // copy source data values into the derivatives' internal cache:
              derivative.refreshCache(this.data);
              ready.push(prop);

            }

          } else if (ready.indexOf(prop) === -1) {

            ready.push(prop);

          }

          if (ready.length === total) {
            break search;
          }

        }

      }

      return true;

    }

    addDerivative(prop) {

      const derivative = new Derivative(this.model, prop, this.data[prop]);

      this.derivedProperties.set(prop, derivative);

      // replace the function on the data object with a getter that returns the value of the derivative
      // derivative.value is also a "getter" that automatically recomputes the value only if any of its' dependencies have changed.
      Object.defineProperty(this.data, prop, {
        get() {
          return derivative.value
        },
        configurable: true,
        enumerable: false
      });

      return derivative;

    }

    dispose() {

      let key, val, drv;
      for (key in this.data) {

        if ((val = this.data[key]) && val[_IS_OBSERVABLE_]) {
          // set parent to plain data (not model)
          val[_SET_PARENT_](this.data);
          // kill pointer to attemptCue
          val[_SET_PARENT_CUER_](undefined);
        }

        (drv = this.derivedProperties.get(key)) && Object.defineProperty(this.data, key, {
          value: drv.computation,
          writable: true,
          configurable: true,
          enumerable: true
        });

      }

      // Reassign plain data to parent node
      (this.parent[_SOURCE_DATA_] || this.parent)[this.ownPropertyName] = this.data;

      // kill pointer to model on plain data
      delete this.data[_PROXY_MODEL_];

      // kill internal pointers
      this.attemptCueParent = undefined;
      this.model = undefined;
      this.data = undefined;

      // empty lookups
      this.reactors.clear();
      this.observersOf.clear();
      this.derivativesOf.clear();
      this.derivedProperties.clear();
      this.fnCache.clear();
      this.valueCache.clear();
      this.metaProperties.clear();

      // instance will go out of scope when this function has run.
      return true;

    }

  }

  function findParentAndOwnPropertyName(target, scope) {

    // TODO: currently huge overhead when instantiating models because we're brute-force searching from the root each time a model is created as part of a list (objects in an array etc).
    // TODO: we can optimize this search dramatically by pre-determining expected parents of state modules via their registration name and only fallback to brute-force search from the root store when the initial assumption fails

    if (isArray(scope)) {
      for (let i = 0, v, result; i < scope.length; i++) {
        if ((v = scope[i])) {
          if (v === target || v[_SOURCE_DATA_] === target) {
            return {
              parent: scope,
              ownPropertyName: i
            };
          } else if (typeof v === 'object' && (result = findParentAndOwnPropertyName(target, v))) {
            return result;
          }
        }
      }
    } else {
      let prop, v, result;
      for (prop in scope) {
        if ((v = scope[prop])) {
          if (v === target || v[_SOURCE_DATA_] === target) {
            return {
              parent: scope,
              ownPropertyName: prop
            };
          } else if (typeof v === 'object' && (result = findParentAndOwnPropertyName(target, v))) {
            return result;
          }
        }
      }
    }

  }

  // Observation Object
  class Observation {

    constructor(type, property, value, mutationDetails) {
      this.type = type;
      this.property = property;
      this.value = value;
      this.mutationDetails = mutationDetails;
    }

  }

  // Observer Entity
  class Observer {

    constructor(reactor, reaction) {
      this.reactor = reactor;
      this.reactionTarget = reactor.target;
      this.reaction = reaction;
    }

    react(observation) {
      this.reaction.call(this.reactionTarget, observation);
    }

  }

  // Derived Property
  class Derivative {

    constructor(parent, ownPropertyName, computation) {

      this[_IS_DERIVATIVE_] = true; // id

      this.parent = parent; // the source of the data for the computation
      this.ownPropertyName = ownPropertyName;
      this.computation = computation; // the function that computes a result from data points on the source

      this.dependencies = []; // property names this derivative depends on
      this.derivatives = []; // other derivatives that depend on this derivative. Allows for downwards traversal.
      this.superDerivatives = []; // if derivative is derived from other derivative(s), set superDerivative(s). Allows for upwards traversal.

      this.dependencyValues = Object.create(null); // property-value cache

      this.observers = []; // collection of observers observing this property
      this.stopPropagation = false; // flag for the last observed derivative in a dependency branch (optimization)

      this.intermediate = undefined; // intermediate computation result
      this._value = undefined; // current computation result

      this.readyToInstall = false; // flag indicating that all dependencies are resolved so we can compute initial value (required only at installation time)
      this.needsUpdate = false; // flag indicating that one or many dependencies have been updated (required by this.value getter)
      this.hasChanged = false; // flag indicating that the computation has yielded a new result (required for dependency traversal)

    }

    get value() {

      // Dynamic getter of value which recomputes only when
      // a direct (shallow) dependency has been previously updated

      if (this.needsUpdate) {

        // recompute
        this.intermediate = this.computation.call(null, this.dependencyValues);

        // compare to previous value (shallow compare objects)
        if (this._value && typeof this._value === 'object' && this.intermediate && typeof this.intermediate === 'object') {

          if (isShallowEqual(this._value, this.intermediate)) {
            this.hasChanged = false;
          } else {
            this._value = this.intermediate;
            this.hasChanged = true;
          }

        } else if (this.intermediate !== this._value) {

          this._value = this.intermediate;
          this.hasChanged = true;

        } else {

          this.hasChanged = false;

        }

        // computation is up to date (until it gets invalidated by changing a dependency again...)
        this.needsUpdate = false;

      }

      return this._value;

    }

    updateProperty(property, value) {
      // update a single dependency of the derivative.
      // the passed value is guaranteed to have changed
      this.dependencyValues[property] = value;
      // because a dependency has been updated, we need to recompute
      // this.value the next time it is requested.
      this.needsUpdate = true;
    }

    connect() {
      // running the computation will trigger "get" handlers on the parent model for any properties that the computation depends on
      // the "get" handler checks if there is a derivative to install, and if so, it adds the derivative as a dependency of the triggered property
      // and it adds all triggered properties to this derivatives' source properties.
      derivativeToConnect = this;

      try {
        // at installation time, the computation will likely request dependencies that are still undefined.
        // this would throw in many cases but since we don't care at this point about the actual value but only the property the derivative depends on, we can safely ignore the error.
        this.computation.call(this.parent, this.parent);

      } catch (e) {}

      derivativeToConnect = null;

    }

    refreshCache(source) {
      // pulls in all dependency values
      for (let i = 0, k; i < this.dependencies.length; i++) {
        k = this.dependencies[i];
        this.dependencyValues[k] = source[k];
      }
      this.needsUpdate = true;
    }

    dispose(root = true) {

      let i;

      this.parent[_DERIVED_PROPERTIES_].delete(this.ownPropertyName);

      this.parent[_DERIVATIVES_OF_].forEach((prop, derivatives) => {
        i = derivatives.indexOf(this);
        if (i > -1) derivatives.splice(i, 1);
      });

      // clear anything that could potentially hold on to strong pointers
      this.dependencyValues = undefined;
      this.observers = undefined;
      this.intermediate = undefined;
      this._value = undefined;

      // remove self from any superDerivatives
      for (i = 0; i < this.superDerivatives.length; i++) {
        this.superDerivatives[i].derivatives = this.superDerivatives[i].derivatives.filter(d => d !== this);
        // reset end of observation
        flagClosestObservedSuperDerivativesOf(this.superDerivatives[i], true);
      }

      // dispose all sub-derivatives
      for (i = 0; i < this.derivatives.length; i++) {
        this.derivatives[i].dispose(false); // false -> downwards recursion form root of removal
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

  // Derivative Handling
  function setupDerivatives(data, model, derivedProperties) {

    const props = Object.keys(data);
    const total = props.length;

    let i, k, prop;

    // 1: Create Derivatives + Modify Data
    for (i = 0; i < props.length; i++) {
      // for each (own) function in the data object
      prop = props[i];
      if (data.hasOwnProperty(prop) && typeof data[prop] === 'function') {
        addDerivative(data, model, prop, derivedProperties);
      }
    }

    if (derivedProperties.size === 0) {
      return false;
    }

    // 2: Connect Derivatives.
    // handshake method that sets up the derivative as a derivative of it's
    // model sources and the sources as dependencies on the derivative.
    derivedProperties.forEach(derivative => derivative.connect());

    // Next we have to traverse the model and fill the cache of each derivative.
    // Because derivatives can depend on other derivatives, we need this
    // basic tree traversal algorithm that only computes a derived property
    // when all of it's dependencies are marked ready.

    let sourceProp, derivative, sourceDerivative;
    const ready = [];

    // 3: Traverse
    search: while (ready.length < total) { // search entire stack until all derivatives are ready

      for (i = 0; i < total; i++) { // for each property

        prop = props[i];
        derivative = derivedProperties.get(prop);

        if (derivative && derivative.readyToInstall === false) { // if property is a pending derivative

          for (k = 0; k < derivative.dependencies.length; k++) { // for each of its source dependencies

            sourceProp = derivative.dependencies[k];
            sourceDerivative = derivedProperties.get(sourceProp);

            if (sourceDerivative && sourceDerivative.readyToInstall === false) {
              derivative.readyToInstall = false;
              break;
            } else {
              derivative.readyToInstall = true;
            }

          }

          if (derivative.readyToInstall) {

            // all dependencies of the derivative are now available.
            // copy source data values into the derivatives' internal cache:
            derivative.refreshCache(data);
            ready.push(prop);

          }

        } else if (ready.indexOf(prop) === -1) {

          ready.push(prop);

        }

        if (ready.length === total) {
          break search;
        }

      }

    }

    return true;

  }

  function addDerivative(data, model, property, derivedProperties) {

    const derivative = new Derivative(model, property, data[property]);

    derivedProperties.set(property, derivative);

    // replace the function on the data object with a getter that returns the value of the derivative
    // derivative.value is also a "getter" that automatically recomputes the value only if any of its' dependencies have changed.
    Object.defineProperty(data, property, {
      get() {
        return derivative.value
      },
      configurable: true,
      enumerable: false
    });

    return derivative;

  }

  function setEndOfPropagationInBranchOf(derivative, direction) {
    // traverses derivatives to flag the deepest observed derivative in a computation branch.
    // this allows us to stop propagation of computations at the deepest occurring observer
    // and never recompute derivatives that are either unobserved or are a precursor dependency of an
    // eventually unobserved derivative.
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
    if (derivative.derivatives.length) {
      for (let i = 0, subDerivative; i < derivative.derivatives.length; i++) {
        subDerivative = derivative.derivatives[i];
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

  // Reaction Handling

  function cue(type, prop, value, mutationDetails, observers, derivatives, stopPropagation) {

    // Collect observers and derivatives of the changed property and, recursively those of all of it's descendant derivatives

    let i, l, item;

    if (observers) {
      for (i = 0; i < observers.length; i++) {
        item = observers[i];
        if (MAIN_QUEUE.indexOf(item) === -1) {
          MAIN_QUEUE.push(item, new Observation(type, prop, value, mutationDetails));
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
        result = item.value; // calls "getter" -> recomputes value

        if (item.hasChanged) { // has value changed after recomputation -> recurse
          cue('change', item.ownPropertyName, result, undefined, item.observers, item.derivatives, item.stopPropagation);
        }

      }

    }

  }

  function cueImmediate(type, prop, value, mutationDetails, observers, derivatives, stopPropagation) {

    // Collect immediate observers and derivatives of the changed property. Don't recurse over sub-derivatives just yet.

    let i, item;

    if (observers) {
      for (i = 0; i < observers.length; i++) {
        item = observers[i];
        if (MAIN_QUEUE.indexOf(item) === -1) {
          MAIN_QUEUE.push(item, new Observation(type, prop, value, mutationDetails));
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

    for (let i = 0, item, result; i < derivatives.length; i++) {
      item = derivatives[i];
      result = item.value; // calls "getter" -> recomputes value
      if (item.hasChanged) {
        cue('change', item.ownPropertyName, result, undefined, item.observers, item.derivatives, item.stopPropagation);
      }
    }

  }

  function react() {

    isReacting = true;

    const l = MAIN_QUEUE.length;

    // MAIN_QUEUE contains tuples of [observer, changedValue, changedProperty]
    for (let i = 0; i < l; i += 3) {
      MAIN_QUEUE[i].react(MAIN_QUEUE[i + 1], MAIN_QUEUE[i + 2]);
    }

    // empty the queue
    MAIN_QUEUE.splice(0, l);

    isReacting = false;

  }

  // Public API: Cue.State [function]
  defineProperty(Cue, 'State', {
    value: registerStateModule
  });

  function registerStateModule(name, moduleInitializer) {

    if (typeof name !== 'string') {
      throw new TypeError(`Can't create Cue State Module. First argument must be name of type string but is of type "${typeof name}".`);
    } else if (typeof moduleInitializer !== 'function') {
      throw new TypeError(`Can't create Cue State Module. Second argument must be module of type function but is of type "${typeof moduleInitializer}".`);
    } else if (CUE_STATE_MODULES.has(name)) {
      throw new Error(`A State Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
    }

    let module = null;
    let statik = null;

    const StateConstructor = props => {

      // lazily initialize the module
      module || (module = setupStateModule(moduleInitializer));

      if (module.static) { // static indicates that all calls to this module should return the same pointer to the underlying data model (not a new instance)

        statik || (statik = assign(create(module.actions), module.defaults, module.computed));

        if (module.initialize) {
          module.initialize.call(statik, props);
        }

        return statik;

      } else {

        // create a new instance by deep cloning defaults
        const instance = assign(
          create(module.actions),
          deepCloneStateInstance(module.defaults),
          module.computed
        );

        if (module.initialize) {
          module.initialize.call(instance, props);
        }

        return instance;

      }

    };

    CUE_STATE_MODULES.set(name, StateConstructor);

    return StateConstructor;

  }

  function setupStateModule(moduleInitializer) {

    const CONFIG = moduleInitializer(CUE_STATE_PROTO);

    if (!CONFIG || CONFIG.constructor !== Object) {
      throw new TypeError(`Can't create State Module because the CONFIGuration function does not return a plain object.`);
    }

    if (!CONFIG.props || CONFIG.props.constructor !== Object) {
      throw new TypeError(`State Module requires "props" pojo containing default and optional computed properties.`);
    }

    const MODULE = {
      defaults: {},
      computed: {},
      initialize: undefined,
      actions: {},
      static: CONFIG.static === true,
      imports: CONFIG.imports,
    };

    // Split props into default and computed properties
    let prop, val;
    for (prop in CONFIG.props) {

      val = CONFIG.props[prop];

      if (typeof val === 'function') {
        MODULE.computed[prop] = val;
      } else {
        MODULE.defaults[prop] = val;
      }

    }

    // Collect all methods except "initialize" on action delegate prototype
    for (prop in CONFIG) {

      val = CONFIG[prop];

      if (prop === 'initialize') {

        if (typeof val === 'function') {
          MODULE.initialize = val;
        } else {
          throw new TypeError(`"initialize" is a reserved word for Cue State Modules and must be a function but is of type ${typeof val}`);
        }

      } else if (typeof val === 'function') {

        MODULE.actions[prop] = val;

      }

    }

    return MODULE;

  }

  function deepCloneStateInstance(o) {

    // Deep cloning for plain Arrays and Objects

    if (isArray(o)) {

      const clone = [];

      for (let i = 0, v; i < o.length; i++) {
        v = o[i];
        clone[i] = typeof v === 'object' ? deepCloneStateInstance(v) : v;
      }

      return clone;

    }

    if (o && o.constructor === Object) {

      const clone = {};

      let i, v;

      for (i in o) {
        v = o[i];
        clone[i] = typeof v === 'object' ? deepCloneStateInstance(v) : v;
      }

      return clone;

    }

  }

  // Registered UI Components
  const CUE_UI_MODULES = new Map();

  // UI Module Type Identifier
  const CUE_UI_TYPE_ID = 'component';

  // DOM Elements -> Reactors
  const REACTORS = new WeakMap();

  // The CUE Proto Object (Inner-API) exposed to Cue.Component registration closures
  // inherits methods and properties from main CUE_PROTO object and thus has access to plugins and generic utilities
  const CUE_UI_PROTO = create(CUE_PROTO, {

    import: {
      value: function(name) {
        const component = CUE_UI_MODULES.get(name);
        if (!component) throw new ReferenceError(`Can't import UI Component because nothing is registered under "${name}".`);
        return component;
      }
    }

  });

  class Reactor {

    constructor(target) {

      if (typeof target !== 'object') {
        throw new TypeError(`Can't create Reactor with the provided target because it has to be of type 'object' but is "${typeof target}".`);
      } else if (target[_IS_REACTOR_TARGET_]) {
        throw new TypeError(`Can't create Reactor because the provided target object is already wrapped by another Reactor.`);
      }

      this.target = target;

      // extend target object for cleaning up when target is removed externally
      Object.defineProperties(target, {
      [_IS_REACTOR_TARGET_]: {
          value: true,
          configurable: true
        },
      [_DISPOSE_REACTOR_]: {
          value: () => this.dispose(),
          configurable: true
        },
      });

      this.source = undefined;
      this.observedProperties = new Set();

    }

    attachTo(source) {

      if (this.source) throw new ReferenceError(`Observer already has a source. Detach from the existing source before attaching to a new one.`);
      if (typeof source !== 'object') throw new TypeError(`Can't observe source because it has to be of type 'object' but is "${typeof source}".`);

      this.source = source[_PROXY_MODEL_] || source;

      return this;

    }

    detach() {

      if (!this.source) throw new ReferenceError(`Can't clear non-existing source.`);

      if (this.source[_IS_OBSERVABLE_] && this.observedProperties.size) {
        this.unobserveProperties();
      }

      this.source = undefined;

      return this;

    }

    dispose() {

      this.unobserveProperties();

      delete this.target[_IS_REACTOR_TARGET_];
      delete this.target[_DISPOSE_REACTOR_];

      this.source = undefined;
      this.target = undefined;
      this.observedProperties = undefined;

    }

    observeProperty(property, handler, autorun) {

      if (!this.source) throw new ReferenceError(`Can't observe because no observation source has been assigned to observer!`);
      if (typeof handler !== 'function') throw new TypeError(`Can't observe property "${property}" because the provided handler is of type "${typeof handler}".`);

      if (!this.source[_IS_OBSERVABLE_]) {
        this.source = Observable.create(this.source, this.sourceParent, this.sourceOwnPropertyName);
      }

      const value = this.source[property];
      let plainData = value;
      const derivative = this.source[_DERIVED_PROPERTIES_].get(property);
      const source_observers = this.source[_OBSERVERS_OF_];

      const observer = new Observer(this, handler);

      this.source[_REACTORS_].add(this); // set -> only adds reactor if it doesn't already have it
      this.observedProperties.add(property);

      if (typeof value === 'object' && value !== null) {

        // changes to immediate children of objects bubble to the parent so any nested objects must be made observable as well
        if (value[_IS_OBSERVABLE_]) {
          plainData = value[_SOURCE_DATA_];
        } else if (value[_PROXY_MODEL_]) {
          this.source[property] = value[_PROXY_MODEL_];
        } else if (!derivative) {
          // unobserved object that is not a derivative. make it observable
          Observable.create(value, this.source, property);
        }

      }

      if (derivative) {
        derivative.observers.push(observer);
        setEndOfPropagationInBranchOf(derivative, TRAVERSE_DOWN);
      }

      if (source_observers.has(property)) {
        source_observers.get(property).push(observer);
      } else {
        source_observers.set(property, [observer]);
      }

      if (autorun === true) {
        observer.react(new Observation('set', property, plainData, undefined));
      }

      return this;

    }

    observeProperties(propHandlers, autorun) {

      if (!this.source) throw new ReferenceError(`Can't observe because no observation source has been assigned to observer!`);
      if (typeof propHandlers !== 'object') throw new TypeError(`Can't observe properties because the propHandler is not a pojo of type {property: function}`);

      if (!this.source[_IS_OBSERVABLE_]) {
        this.source = Observable.create(this.source);
      }

      this.source[_REACTORS_].add(this);
      const source_observers = this.source[_OBSERVERS_OF_];
      const source_derivatives = this.source[_DERIVED_PROPERTIES_];

      let prop, observer, value, plainData, derivative;
      for (prop in propHandlers) {

        if (typeof propHandlers[prop] !== 'function') {
          throw new TypeError(`Reaction for "${prop}" has to be a function but is of type "${typeof propHandlers[prop]}".`);
        }

        value = this.source[prop];
        plainData = value;
        derivative = source_derivatives.get(prop);

        observer = new Observer(this, propHandlers[prop]);

        this.observedProperties.add(prop);

        if (typeof value === 'object' && value !== null) {

          if (value[_IS_OBSERVABLE_]) {
            plainData = value[_SOURCE_DATA_];
          } else if (value[_PROXY_MODEL_]) {
            this.source[prop] = value[_PROXY_MODEL_];
          } else if (!derivative) {
            Observable.create(value, this.source, prop);
          }

        }

        if (derivative) {
          derivative.observers.push(observer);
          setEndOfPropagationInBranchOf(derivative, TRAVERSE_DOWN);
        }

        if (source_observers.has(prop)) {
          source_observers.get(prop).push(observer);
        } else {
          source_observers.set(prop, [observer]);
        }

        if (autorun === true) {
          observer.react(new Observation('set', prop, plainData, undefined));
        }

      }

      return this;

    }

    unobserveProperty(property) {

      if (!this.observedProperties.has(property)) {
        throw new ReferenceError(`Can't unobserve property "${property}" because it is not being observed.`);
      } else {
        this.observedProperties.delete(property);
      }

      const derivative = this.source[_DERIVED_PROPERTIES_].get(property);

      if (derivative) {
        derivative.observers.splice(0, derivative.observers.length);
        setEndOfPropagationInBranchOf(derivative, TRAVERSE_UP);
      }

      // Remove this observer from the source object
      const source_observers = this.source[_OBSERVERS_OF_];
      const property_observers = source_observers.get(property);

      if (property_observers) {

        const removed = property_observers.filter(observer => observer.reactor !== this);

        if (removed.length === 0) {
          source_observers.delete(property);
        } else {
          source_observers.set(property, removed);
        }

      }

      if (this.observedProperties.size === 0) {
        this.source[_REACTORS_].delete(this);
      }

      // If no more ObserverArrays (after the previous deletion)
      if (source_observers.size === 0) {
        // dispose the observable because nothing is being observed anymore
        this.source.dispose();
        this.source = undefined;
        this.sourceParent = undefined;
        this.sourceOwnPropertyName = undefined;
      }

      // don't return so "this" can go out of scope.

    }

    unobserveProperties(properties) {

      const source_reactors = this.source[_REACTORS_];
      const source_observers = this.source[_OBSERVERS_OF_];
      const source_derivatives = this.source[_DERIVED_PROPERTIES_];

      let derivative, property_observers;

      properties || (properties = this.observedProperties);

      properties.forEach(property => {

        if (!this.observedProperties.has(property)) {
          throw new ReferenceError(`Can't unobserve property "${property}" because it is not being observed.`);
        } else {
          this.observedProperties.delete(property);
        }

        derivative = source_derivatives.get(property);

        if (derivative) {
          derivative.observers.splice(0, derivative.observers.length);
          setEndOfPropagationInBranchOf(derivative, TRAVERSE_UP);
        }

        property_observers = source_observers.get(property);

        if (property_observers) {

          property_observers = property_observers.filter(observer => observer.reactor !== this);

          if (property_observers.length === 0) {
            source_observers.delete(property);
          } else {
            source_observers.set(property, property_observers);
          }

        }

      });

      if (this.observedProperties.size === 0) {
        source_reactors.delete(this);
      }

      if (source_observers.size === 0) {
        this.source.dispose();
        this.source = undefined;
        this.sourceParent = undefined;
        this.sourceOwnPropertyName = undefined;
      }

    }

  }

  // Implementation of DOM ClassList that works with mapped classNames
  // Useful when a component has generated unique, component-scoped classNames
  // but we want to work with the user-defined classNames in our high-level code.

  const __mappedClassNames__ = Symbol('ClassName Map');
  const __elementClassList__ = Symbol('Original ClassList');

  class MappedClassList {

    constructor(map, element) {

      if (!map) {
        throw new TypeError(`Can't create MappedClassList. First argument has to be a plain Object, 2D Array or a Map but is ${JSON.stringify(map)}.`);
      } else if (map.constructor === Object) {
        map = new Map(Object.entries(map));
      } else if (Array.isArray(map)) {
        map = new Map(map);
      }

      // internalize map and original classList
      Object.defineProperties(this, {
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

  const {
    createUID
  } = CUE_PROTO;

  // Library stylesheet that components can write scoped classes to
  const CUE_UI_STYLESHEET = (() => {
    const stylesheet = document.createElement('style');
    stylesheet.id = 'CUE-STYLES';
    document.head.appendChild(stylesheet);
    return stylesheet.sheet;
  })();

  // CSS Helpers to generate Component-scoped classes and keyframes
  function scopeStylesToComponent(styles, template) {

    let className, classRules, classRule, pseudoRuleIndex, pseudoRuleStyle, uniqueClassName, ruleIndex, ruleStyle;

    for (className in styles) {

      uniqueClassName = `${className}-${createUID()}`;

      ruleIndex = CUE_UI_STYLESHEET.insertRule(`.${uniqueClassName} {}`, CUE_UI_STYLESHEET.cssRules.length);
      ruleStyle = CUE_UI_STYLESHEET.cssRules[ruleIndex].style;

      classRules = styles[className];

      for (classRule in classRules) {
        if (classRule[0] === ':' || classRule[0] === ' ') {
          pseudoRuleIndex = CUE_UI_STYLESHEET.insertRule(`.${uniqueClassName}${classRule} {}`, CUE_UI_STYLESHEET.cssRules.length);
          pseudoRuleStyle = CUE_UI_STYLESHEET.cssRules[pseudoRuleIndex].style;
          Object.assign(pseudoRuleStyle, classRules[classRule]);
          delete classRules[classRule];
        }
      }

      Object.assign(ruleStyle, classRules);
      styles[className] = uniqueClassName;

      if (template) {
        replaceClassNameInElement(className, uniqueClassName, template);
      }

    }

    return styles;

  }

  function replaceClassNameInElement(a, b, element) {
    element.classList.replace(a, b);
    for (let i = 0; i < element.children.length; i++) {
      replaceClassNameInElement(a, b, element.children[i]);
    }
  }

  function scopeKeyframesToComponent(keyframes) {

    let name, uniqueName, framesIndex, framesSheet, frames, percent, index, style;

    for (name in keyframes) {

      uniqueName = `${name}-${createUID()}`;

      framesIndex = CUE_UI_STYLESHEET.insertRule(`@keyframes ${uniqueName} {}`, CUE_UI_STYLESHEET.cssRules.length);
      framesSheet = CUE_UI_STYLESHEET.cssRules[framesIndex];

      frames = keyframes[name];

      for (percent in frames) {
        framesSheet.appendRule(`${percent}% {}`);
        index = framesSheet.cssRules.length - 1;
        style = framesSheet.cssRules[index].style;
        Object.assign(style, frames[percent]);
      }

      keyframes[name] = uniqueName;

    }

    return keyframes;

  }

  // reconciliation utils
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

  // UI Instance wrapper available as "this" in component lifecycle methods.
  // Provides access to the raw dom element, imports, keyframes and styles
  // Exposes shorthands and utility methods that allow for efficient and convenient DOM querying, manipulation and event binding.

  class CueComponent {

    constructor(element, imports, styles, keyframes) {

      this.element = element;

      this.imports = imports;

      this.keyframes = keyframes;
      this.styles = styles;

      // In case component-scope classes have been generated in a styles object, map default classNames to unique classNames internally.
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
      // "update" hence offers a very fast alternative for rendering when it doesn't make sense for each array item to be an observable reactive state module

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

    observe(state, property, handler, autorun) {

      // high level method which delegates a number of internal processes
      // which are required to bind an element to a state model so we can
      // auto-react with the element whenever a specified property value on the state model has changed.

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

  // # Public API: Cue.Component [function]

  defineProperty(Cue, 'UI', {
    value: registerUIModule
  });

  function registerUIModule(name, moduleInitializer) {

    if (typeof name !== 'string') {
      throw new TypeError(`Can't create Cue-UI Module. First argument must be name of type string but is of type "${typeof name}".`);
    } else if (!moduleInitializer || (typeof moduleInitializer !== 'function' && moduleInitializer.constructor !== Object)) {
      throw new TypeError(`Can't create Cue-UI Module. Second argument must be module initializer function or configuration object but is of type "${typeof moduleInitializer}".`);
    } else if (CUE_UI_MODULES.has(name)) {
      throw new Error(`A UI Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
    }

    let module = null;

    const ComponentConstructor = state => {

      // lazily initialize the module
      module || (module = setupUIModule(moduleInitializer));

      // create new UI Component Instance
      const component = new CueComponent(
        module.template.cloneNode(true),
        module.imports,
        module.styles,
        module.keyframes
      );

      // initialize
      if (module.initialize) {
        module.initialize.call(component, state);
      }

      // return dom element for compositing
      return component.element;

    };

    CUE_UI_MODULES.set(name, ComponentConstructor);

    return ComponentConstructor;

  }

  function setupUIModule(moduleInitializer) { // runs only once per module

    // initializer can be function or plain config object (pre-checked for object condition in "registerUIModule")
    const CONFIG = typeof moduleInitializer === 'function' ? moduleInitializer(CUE_UI_PROTO) : moduleInitializer;

    if (!CONFIG || CONFIG.constructor !== Object) {
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
          return document.createTextNode(x);
      }

    } else if (x instanceof Element) {

      return x;

    }

  }

  let CUE_ROOT_STATE = null;

  let CUE_ROOT_COMPONENT_PARENT = document.body;
  let CUE_ROOT_COMPONENT = null;

  const CUE_APP_PROTO = create(CUE_PROTO, {

    RootState: {

      get() {
        return CUE_ROOT_STATE;
      },

      set(data) {
        CUE_ROOT_STATE = data;
      }

    },

    RootComponent: {

      get() {
        return CUE_ROOT_COMPONENT;
      },

      set(component) {
        CUE_ROOT_COMPONENT = component;
      }

    },

    RootComponentParent: {

      get() {
        return CUE_ROOT_COMPONENT_PARENT;
      },

      set(domElement) {

        if (!domElement || !(domElement instanceof Element || domElement.nodeName)) {
          throw new TypeError(`RootComponentParent must be a DOM Element but is ${JSON.stringify(domElement)}`);
        }

        CUE_ROOT_COMPONENT_PARENT = domElement;

      }

    },

    importState: {

      value: function(name) {
        return CUE_STATE_PROTO.import(name);
      }

    },

    importComponent: {

      value: function(name) {
        return CUE_UI_PROTO.import(name);
      }

    },

    start: {

      value: function(initialProps) {

        if (!this.RootState) {
          throw new Error(`Application can't start because no RootState has been defined.`);
        }

        if (!this.RootComponent) {
          throw new Error(`Application can't start because no RootComponent has been defined.`);
        }

        const rootState = typeof this.RootState === 'function' ? this.RootState(initialProps) : this.RootState;

        STORE.ROOT = Observable.create(rootState, STORE, 'ROOT');

        CUE_ROOT_COMPONENT_PARENT.appendChild(this.RootComponent(STORE.ROOT));

      }

    }

  });

  let appRegistered = false;

  defineProperty(Cue, 'App', {

    value: function(initialize) {

      if (appRegistered) {
        throw new Error(`An App has already been registered. You can only run a single Cue App per context.`);
      }

      appRegistered = true;

      initialize(CUE_APP_PROTO);

    }

  });
}(window || this));