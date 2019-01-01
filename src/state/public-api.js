
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
