
/**
 * Creates a reusable State Module. A module is a blueprint from which factories can create instances of State.
 * When moduleInitializer argument is a function it must be called with CUE_LIB.state as the first argument to make it available in the public module definition closure.
 * @function initializeStateModule
 * @param {(object|function)} moduleInitializer - The second argument passed to public Cue.State function. Can be a config object or a function returning a config object
 * @returns {object} module                     - A reusable module from which a factory can create new instances of state
 * */

function initializeStateModule(moduleInitializer) {

  const config = isFunction(moduleInitializer) ? moduleInitializer(CUE_LIB.state) : moduleInitializer;

  if (!isPlainObject(config)) {
    throw new TypeError(`Can't create State Module because the config function does not return a plain object.`);
  }

  const type = isArray(config.props) ? 'array' : isPlainObject(config.props) ? 'object' : 'illegal';

  if (type === 'illegal') {
    throw new TypeError(`State Module requires "props" object (plain object or array) containing default and optional computed properties.`);
  }

  /**
   * Module is the internal representation of a state component from which instances can be created.
   * Properties on the internal module differ from those on the public interface.
   * @namespace module
   * @property {object}   defaults      - contains public "props" that are not functions
   * @property {map}      computed      - contains public "props" that are functions (will be resolved by dependency order)
   * @property {map}      interceptors  - contains public "willChange" methods that intercept property changes before they are written to state instances
   * @property {map}      reactions     - contains public "didChange" methods which trigger side-effects after a property on a state instance has changed
   * @property {function} initialize    - a pseudo-constructor function which, when defined, is called initially after an internal state-instance has been created. Defaults to NOOP.
   * @property {object}   actions       - contains any methods from public module (except built-ins like initialize). These methods will be shared on the module prototype.
   * @property {boolean}  static        - indicates whether module.defaults should be cloned for each instance (true, default behaviour) or shared between all instances (false)
   * @property {object}   imports       - contains sub-modules this modules extends itself with
   */

  const module = {
    defaults: type === 'array' ? [] : {},
    computed: new Map(),
    interceptors: new Map(),
    reactions: new Map(),
    initialize: NOOP,
    actions: {},
    static: config.static === true,
    imports: config.imports
  };

  // 1. Split props into default and computed properties
  let prop, i, val;
  if (type === 'array') {

    for (i = 0; i < config.props.length; i++) {
      val = config.props[i];
      if (isFunction(val)) {
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

      if (isFunction(val)) {
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
  installDependencies(config.props, module.computed);
  // 2.1 Resolve dependencies and sort derivatives topologically
  module.computed = OrderedDerivatives.from(module.computed);

  // 3. Collect all methods except "initialize" on action object
  for (prop in config) {

    val = config[prop];

    if (prop === 'initialize') {

      if (isFunction(val)) {
        module[prop] = val;
      } else {
        throw new TypeError(`"${prop}" is a reserved word for Cue State Modules and must be a function but is of type "${typeof val}"`);
      }

    } else if (isFunction(val)) {

      module.actions[prop] = val;

    }

  }

  // 4. Collect interceptors
  for (prop in config.willChange) {
    val = config.willChange[prop];
    if (!isFunction(val)) throw new TypeError(`Module.willChange handler for "${prop}" is not a function.`);
    module.interceptors.set(prop, val);
  }

  // 5. Collect watchers
  for (prop in config.didChange) {
    val = config.didChange[prop];
    if (!isFunction(val)) throw new TypeError(`Module.didChange handler for "${prop}" is not a function.`);
    module.reactions.set(prop, val);
  }

  return module;

}