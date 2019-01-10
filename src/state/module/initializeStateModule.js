
function initializeStateModule(moduleInitializer) {

  // creates a reusable Module. A Module is a blueprint
  // from which factories can create instances of State.

  const config = typeof moduleInitializer === 'function' ? moduleInitializer(CUE_STATE_PROTO) : moduleInitializer;

  if (!config || config.constructor !== Object) {
    throw new TypeError(`Can't create State Module because the config function does not return a plain object.`);
  }

  const type = Array.isArray(config.props) ? 'array' : config.props && config.props.constructor === Object ? 'object' : 'illegal';

  if (type === 'illegal') {
    throw new TypeError(`State Module requires "props" object (plain object or array) containing default and optional computed properties.`);
  }

  const module = {
    defaults: type === 'array' ? [] : {},
    derivatives: {
      computations: new Map(), // derivedPropertyName -> computationFunction
      dependencies: new Map()  // anyPropertyName -> [ ...vDerivatives = { derivedPropertyName: string, computation: function, subDerivatives: [...derivedPropertyNames], superDerivatives: [...derivedPropertyNames] } ]
    },
    initialize: undefined,
    actions: {},
    static: config.static === true,
    imports: config.imports,
  };

  // Split props into default and computed properties

  let prop, i, val;

  if (type === 'array') {

    for (i = 0; i < config.props.length; i++) {
      val = config.props[i];
      if (typeof val === 'function') {
        module.derivatives.computations.set(i, val);
      } else {
        module.defaults.push(val);
      }
    }

  } else {

    for (prop in config.props) {

      val = config.props[prop];

      if (typeof val === 'function') {
        module.derivatives.computations.set(prop, val);
      } else {
        module.defaults[prop] = val;
      }

    }

  }

  // TODO: Create static dependency graph for derived properties in the module.
  // this dependency graph is a map of {key: property names ->TO-> value: an array of virtual derivatives which are being derived from the key property name.}
  // for setup we can create a proxy just for derivative setup, with a special get handler that installs the properties
  // into the virtual derivatives (just like the current implementation, but pre-instantiation time)
  // We should account for unordered dependencies and traverse the derivatives and properties as implemented in current
  // "setupDerivatives" loop.
  // When a module is instantiated, we create instances of derivatives with their dependency graph already set up.

  // Collect all methods except "initialize" on action object
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