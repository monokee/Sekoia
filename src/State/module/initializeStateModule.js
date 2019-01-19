
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