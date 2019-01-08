
function initializeStateModule(moduleInitializer) {

  // creates a reusable Module. A Module is a blueprint
  // from which factories can create instances of State.

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