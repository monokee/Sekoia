
// Public API: Cue.State [function]
defineProperty(Cue, 'State', {
  value: registerStateModule
});

function registerStateModule(name, moduleInitializer) {

  if (typeof name !== 'string') {
    throw new TypeError(`Can't create Cue State Module. First argument must be name of type string but is of type "${typeof name}".`);
  } else if (CUE_STATE_MODULES.has(name)) {
    throw new Error(`A State Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
  }

  const runOnce = props => {

    const module = setupStateModule(moduleInitializer);

    let StateFactory;

    if (Array.isArray(module.defaults)) {

      if (module.static) {

        let statik = [];

        StateFactory = props => {
          if (module.initialize) {
            statik[__CUE__].isInitializing = true;
            module.initialize.call(statik, props);
            statik[__CUE__].isInitializing = false;
          }
          return statik;
        };

        StateFactory.prototype = Object.create(Array.prototype);
        Object.setPrototypeOf(statik, StateFactory.prototype);
        statik.push.apply(statik, deepCloneStateInstance(module.defaults));
        assignInstanceProperties(statik);
        statik = wrapStateInProxy(statik);

      } else {

        StateFactory = props => {
          let instance = [];
          Object.setPrototypeOf(instance, StateFactory.prototype);
          instance.push.apply(instance, deepCloneStateInstance(module.defaults));
          assignInstanceProperties(instance);
          instance = wrapStateInProxy(instance);
          if (module.initialize) {
            instance[__CUE__].isInitializing = true;
            module.initialize.call(instance, props);
            instance[__CUE__].isInitializing = false;
          }
          return instance;
        };

        StateFactory.prototype = Object.create(Array.prototype);

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
        statik = Object.assign(Object.create(StateFactory.prototype), deepCloneStateInstance(module.defaults));
        assignInstanceProperties(statik);
        statik = wrapStateInProxy(statik);

      } else {
        
        StateFactory = props => {
          let instance = Object.assign(Object.create(StateFactory.prototype), deepCloneStateInstance(module.defaults));
          assignInstanceProperties(instance);
          instance = wrapStateInProxy(instance);
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

    addShareableModulePropertiesToFactoryPrototype(StateFactory, module);

    CUE_STATE_MODULES.set(name, StateFactory);

    return StateFactory.call(null, props);

  };

  CUE_STATE_MODULES.set(name, runOnce);

  return runOnce;

}

function setupStateModule(moduleInitializer) {
  
  const config = typeof moduleInitializer === 'function' ? moduleInitializer(CUE_STATE_PROTO) : moduleInitializer;

  if (!config || config.constructor !== Object) {
    throw new TypeError(`Can't create State Module because the config function does not return a plain object.`);
  }

  if (!config.props || config.props.constructor !== Object) {
    throw new TypeError(`State Module requires "props" pojo containing default and optional computed properties.`);
  }
  
  const module = {
    defaults: {},
    computed: {},
    initialize: undefined,
    actions: {},
    static: config.static === true,
    imports: config.imports,
  };
  
  // Split props into default and computed properties
  let prop, val;
  for (prop in config.props) {
    
    val = config.props[prop];

    if (typeof val === 'function') {
      module.computed[prop] = val;
    } else {
      module.defaults[prop] = val;
    }
    
  }
    
  // Collect all methods except "initialize" on action delegate prototype
  for (prop in config) {
    
    val = config[prop];
    
    if (prop === 'initialize') {
      
      if (typeof val === 'function') {
        module.initialize = val;
      } else {
        throw new TypeError(`"initialize" is a reserved word for Cue State Modules and must be a function but is of type ${typeof val}`);
      }
      
    } else if (typeof val === 'function') {
      
      module.actions[prop] = val;
      
    }
    
  }
  
  return module;  

}

function addShareableModulePropertiesToFactoryPrototype(stateFactory, module) {

  let key;

  // Computed Properties as Getters
  for (key in module.computed) {
    Object.defineProperty(stateFactory.prototype, key, {
      get() { return this[__CUE__].derivedProperties.get(key).value },
      configurable: true
    });
  }

  // Actions
  for (key in module.actions) {
    Object.defineProperty(stateFactory.prototype, key, {
      value: module.actions[key],
      configurable: true
    });
  }

  // Imports
  Object.defineProperty(stateFactory.prototype, 'imports', {
    value: module.imports,
    configurable: true
  });

}

function assignInstanceProperties(stateInstance) {

  return Object.defineProperty(stateInstance, __CUE__, {
    value: {
      uid: Symbol(),
      parent: null,
      ownPropertyName: '',
      isInitializing: false,
      fnCache: new Map(),
      valueCache: new Map(),
      observersOf: new Map(),
      derivativesOf: new Map(),
      derivedProperties: new Map(),
      attemptCue: attemptCue
    },
    configurable: true
  });

}

function attemptCue(prop, value, oldValue) {

  const drv = this.derivativesOf.get(prop);
  const obs = this.observersOf.get(prop);

  if (drv || obs) {

    if (isAccumulating) {
      cueImmediate(prop, value, oldValue, obs, drv, false);
    } else {
      cueAll(prop, value, oldValue, obs, drv, false);
    }

    return true;

  } else {

    return false;

  }

}

function wrapStateInProxy(stateInstance) {

  return new Proxy(stateInstance, {
    get: proxyGetTrap,
    set: proxySetTrap,
    deleteProperty: proxyDeleteTrap
  });

}

function proxyGetTrap(target, prop) {

  // never intercept instance
  if (prop === __CUE__) return target[__CUE__];

  const instance = target[__CUE__];

  if (derivativeToConnect !== null) {

    // install it as a derivative of the "gotten" property on the model
    if (instance.derivativesOf.has(prop)) {
      instance.derivativesOf.get(prop).push(derivativeToConnect);
    } else {
      instance.derivativesOf.set(prop, [ derivativeToConnect ]);
    }

    // add the "gotten" property key to the derivatives' dependencies
    if (derivativeToConnect.dependencies.indexOf(prop) === -1) {
      derivativeToConnect.dependencies.push(prop);
    }

    // if the "gotten" property is a derivative itself, we install the derivativeToConnect
    // as a derivative of the "gotten" derivative, and the "gotten" property as a
    // superDerivative of derivativeToConnect allowing for "self-aware" traversal in both directions.
    const thisDerivative = instance.derivedProperties.get(prop);

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

  const value = _get(target, prop);

  // never intercept falsy values, nested cue states or the prototype
  if (!value || value[__CUE__] || !target.hasOwnProperty(prop)) return value;

  if (isArray(value) || value.constructor === Object) {
    // recursively proxify nested arrays and objects
    return wrapStateInProxy(assignInstanceProperties(value));
  }

  //TODO: this has to be guarded against methods on prototype.
  //TODO: mmh. both array mutators and module actions live on the prototype.
  //TODO: and both have the potential to mutate the state.
  // TODO: function caching is the wrong approach here. why?
  // because that would create one intercepted method for every method on the objects prototype and cache it on every instance...
  // - wouldn't it be more efficient to have a generic function interceptor method that we call?
  // - no because we need to return a function and that function should not have to be "called" on the outside.
  if (typeof value === 'function') {

    return instance.fnCache.get(prop) || (instance.fnCache.set(prop, (...args) => {

      if (!ARRAY_MUTATORS.has(prop) || instance.parent === null) {
        // mutation via methods means we only react on the parent
        // if method is not array mutator or instance doesn't have parent to react on
        // we only apply the function and the return the result.
        return _apply(value, target, args);
      }

      // create shallow target of the array
      const oldTarget = target.slice();
      const result = _apply(value, target, args);

      let didMutate = false;

      if (oldTarget.length !== target.length) {
        didMutate = true;
      } else {
        for (let i = 0; i < oldTarget.length; i++) {
          if (oldTarget[i] !== target[i]) {
            didMutate = true;
            break;
          }
        }
      }

      if (didMutate) {
        if (instance.parent.attemptCue.call(instance.parent, instance.ownPropertyName, target, oldTarget)) {
          if (!isAccumulating) {
            react();
          }
        }
      }

      return result;

    })).get(prop);

  }

  return value;

}

function proxySetTrap(target, prop, value) {

  //TODO: set parent and ownPropertyName of values that are cue-states here.

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

}

function proxyDeleteTrap(target, prop) {

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
