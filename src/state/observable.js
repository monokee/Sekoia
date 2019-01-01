
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

      const {parent, ownPropertyName} = findParentAndOwnPropertyName(data, STORE);
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
    search : while (ready.length < total) { // search entire stack until all derivatives are ready

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
      get() { return derivative.value },
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

function Obs_ervable(data, _parent, _ownPropertyName) {

  if (data[_IS_OBSERVABLE_]) return data;
  if (data[_PROXY_MODEL_]) return data[_PROXY_MODEL_];

  // reuse proxy handler methods
  const handler = Object.create(Interceptors);

  // extend the proxy handler
  const uid = handler.uid = Symbol();
  const reactors = handler.reactors = new Set();
  const observersOf = handler.observersOf = new Map();
  const derivativesOf = handler.derivativesOf = new Map();
  const derivedProperties = handler.derivedProperties = new Map();

  let parent, ownPropertyName;

  if (_parent) {
    parent = handler.parent = _parent;
    ownPropertyName = handler.ownPropertyName = _ownPropertyName;
  } else {
    const parentAndOwnPropertyName = findParentAndOwnPropertyName(data, STORE);
    if (parentAndOwnPropertyName) {
      parent = handler.parent = parentAndOwnPropertyName.parent;
      ownPropertyName = handler.ownPropertyName = parentAndOwnPropertyName.ownPropertyName;
    } else {
      throw new Error(`State Module does not have a parent. All State must be composed onto a single root store.`);
    }
  }

  const attemptCue = handler.attemptCue = (type, prop, value, mutationDetails) => {

    const drv = derivativesOf.get(prop);
    const obs = observersOf.get(prop);

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

  let attemptCueParent = handler.attempCueParent = handler.parent[_GET_OWN_CUER_];

  handler.metaProperties = new Map([
    [_IS_OBSERVABLE_, true],
    [_SOURCE_DATA_, data],
    [_PARENT_, parent],
    [_OBSERVERS_OF_, observersOf],
    [_DERIVATIVES_OF_, derivativesOf],
    [_DERIVED_PROPERTIES_, derivedProperties],
    [_OWNPROPERTYNAME_, ownPropertyName],
    [_REACTORS_, reactors],
    [_GET_OWN_CUER_, attemptCue],
    [_SET_PARENT_CUER_, value => attemptCueParent = handler.attemptCueParent = value],
    [_SET_PARENT_, value => parent = handler.parent = value],
    [_UID_, uid],
  ]);

  handler.data = data;
  

}

// Proxy Interceptors Delegate Prototype

class Observable {

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

      const {parent, ownPropertyName} = findParentAndOwnPropertyName(data, STORE);
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

}

const Interceptors = {

  get(target, prop) {

    // HANDLE DERIVATIVE INSTALLATION
    if (derivativeToConnect !== null) {

      // install it as a derivative of the "gotten" property on the model
      if (this.derivativesOf.has(prop)) {
        this.derivativesOf.get(prop).push(derivativeToConnect);
      } else {
        this.derivativesOf.set(prop, [ derivativeToConnect ]);
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

      return;

    }

    // HANDLE META PROPERTY ACCESS
    if (typeof prop === 'symbol' && this.metaProperties.has(prop)) {
      return this.metaProperties.get(prop);
    }

    // HANDLE NORMAL GET REQUESTS
    const value = _get(target, prop);

    if (value && !value[_IS_OBSERVABLE_] && (isArray(value) || value.constructor === Object)) {

      // Recursively proxify plain objects and arrays
      return new Observable(value, target, prop);

    } else if (typeof value === 'function') {

      // Cache function access
      return this.fnCache.get(prop) || (this.fnCache.set(prop, (...args) => {

        // if method is not mutating OR there is no attemptCue function on the parent, return early.
        if (!ARRAY_MUTATORS.has(prop) || !this.attemptCueParent) {
          return _apply(value, target, args);
        }

        // create a shallow clone of the target
        const previous = createShallowClone(target);

        // apply function to and (potentially) mutate target
        const result =  _apply(value, target, args);

        // if properties have been mutated
        if (!isShallowEqual(previous, target)) {

          // if parent is being observed or derived from
          if (this.attemptCueParent('methodCall', this.ownPropertyName, target, {method: prop, arguments: args, result: result})) {

            // if we're not accumulating changes
            if (!isAccumulating) {
              react();
            }

          }

        }

        // return function result to comply with default behaviour
        return result;

      })).get(prop);

    } else {

      return value;

    }

  },

  set(target, prop, value) {

    if (this.derivedProperties.has(prop)) {
      throw new Error(`Can not set property "${prop}" because it is derived. Derivatives have to be explicitly deleted before they can be redefined.`);
    }

    if (!isReacting && value !== this.valueCache.get(prop)) {

      _set(target, prop, value);
      this.valueCache.set(prop, value ? value[_SOURCE_DATA_] || value : value);

      // attemptCue property observers + derivatives + check for required extension
      // Note: "attemptCue" will add existing observers + derivatives to MAIN_QUEUE and return true. if there was nothing to add it returns false
      if (this.attemptCue('set', prop, value, undefined)) {

        if (this.attemptCueParent) {
          this.attemptCueParent('setChild', this.ownPropertyName, target, {childProperty: prop, mutationType: 'set'});
        }

        if (!isAccumulating) {
          react();
        }

        return true;

      } else if (this.attemptCueParent && this.attemptCueParent('setChild', this.ownPropertyName, target, {childProperty: prop, mutationType: 'set'})) {

        if (!isAccumulating) {
          react();
        }

        return true;

      }

    }

  },

  deleteProperty(target, prop) {

    if (!isReacting) {

      if (this.derivedProperties.has(prop)) {
        this.derivedProperties.get(prop).dispose(true);
      }

      _delete(target, prop);

      this.valueCache.delete(prop);

      this.attemptCue('delete', prop, undefined, undefined);

      if (this.attemptCueParent) {
        this.attemptCueParent('deleteChild', this.ownPropertyName, target, {childProperty: prop, mutationType: 'delete'});
      }

      if (!isAccumulating) {
        react();
      }

      return true;

    }

  }

};

function findParentAndOwnPropertyName(target, scope) {

  // TODO: currently huge overhead when instantiating models because we're brute-force searching from the root each time a model is created as part of a list (objects in an array etc).
  // TODO: we can optimize this search dramatically by pre-determining expected parents of state modules via their registration name and only fallback to brute-force search from the root store when the initial assumption fails

  if (isArray(scope)) {
    for (let i = 0, v, result; i < scope.length; i++) {
      if ((v = scope[i])) {
        if (v === target || v[_SOURCE_DATA_] === target) {
          return {parent: scope, ownPropertyName: i};
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
          return {parent: scope, ownPropertyName: prop};
        } else if (typeof v === 'object' && (result = findParentAndOwnPropertyName(target, v))) {
          return result;
        }
      }
    }
  }

}