
/**
 * Creates a reusable State Module. A module is a blueprint from which factories can create instances of State.
 * When moduleInitializer argument is a function it must be called with "Module" utility object as the first argument to make it available in the returned, public module configuration object.
 * @function initializeStateModule
 * @param   {string}            name              - The name of the module. Can be namespaced. Has to be unique.
 * @param   {(object|function)} moduleInitializer - The module configuration. When it is a function it is called with the "Module" utility object and must return a plain configuration pojo.
 * @returns {object}            module            - A reusable module blueprint from which a factory can create new instances of state.
 * */

function initializeStateModule(name, moduleInitializer) {

  const TYPE_ARRAY = 1;
  const TYPE_OBJECT = 2;
  const config = isFunction(moduleInitializer) ? moduleInitializer(STATE_MODULE) : moduleInitializer;

  if (!isPlainObject(config)) {
    throw new TypeError(`Can't create State Module because the config function does not return a plain object.`);
  }

  const type = isArray(config.props) ? TYPE_ARRAY : isPlainObject(config.props) ? TYPE_OBJECT : 0;

  if (type !== TYPE_ARRAY && type !== TYPE_OBJECT) {
    throw new TypeError(`State Module requires "props" object (plain object or array) containing default and optional computed properties.`);
  }

  /**
   * Module is the internal representation of a state component from which instances can be created.
   * Properties on the internal module differ from those on the public interface.
   * @namespace module
   * @property {string}   name                      - the unique name of the module.
   * @property {object}   defaults                  - contains public "props" that are not functions
   * @property {Map}      computed                  - contains public "props" that are functions (will be resolved by dependency order)
   * @property {Map}      interceptors              - contains public "willChange" methods that intercept property changes before they are written to state instances TODO: willChange - not implemented
   * @property {Map}      reactions                 - contains public "didChange" methods which trigger side-effects after a property on a state instance has changed TODO: didChange - not implemented
   * @property {Map}      providerDescriptions      - contains ProviderDescription objects for properties that are being injected into the state from a parent state.
   * @property {Map}      consumers                 - contains ConsumerDescription objects that will be used by instances to find child state instances that match the description.
   * @property {function} initialize                - a pseudo-constructor function which, when defined, is called initially after an internal state-instance has been created. Defaults to NOOP.
   * @property {object}   actions                   - contains any methods from public module (except built-ins like initialize). These methods will be shared on the module prototype.
   * @property {boolean}  static                    - indicates whether module.defaults should be cloned for each instance (true, default behaviour) or shared between all instances (false)
   * @property {object}   imports                   - contains sub-modules this modules extends itself with
   */

  const module = {
    name: name,
    defaults: type === TYPE_ARRAY ? [] : {},
    computed: new Map(),
    interceptors: new Map(),
    reactions: new Map(),
    providerDescriptions: new Map(),
    consumers: new Map(),
    initialize: NOOP,
    actions: {},
    static: config.static === true,
    imports: config.imports
  };

  // 1. Split props into default and computed properties

  let prop, i, val;
  if (type === TYPE_ARRAY) {

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

      } else if (val instanceof ProviderDescription) {
        
        module.providerDescriptions.set(i, val);

      } else {

        module.defaults.push(val);

      }
    }

  } else if (type === TYPE_OBJECT) {

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

      } else if (val instanceof ProviderDescription) {
        
        module.providerDescriptions.set(prop, val);

      } else {

        module.defaults[prop] = val;

      }

    }

  }

  // 2. Install dependencies of derivatives by connecting properties
  installDependencies(config.props, module.computed);

  // 2.1 Resolve dependencies and sort derivatives topologically
  module.computed = OrderedDerivatives.from(module.computed);

  // 3. Collect all methods except "initialize" on action object which will be shared on the prototype (like class methods)
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