
/**
 * Creates a reusable State Module. A module is a blueprint from which factories can create instances of State.
 * When moduleInitializer argument is a function it must be called with "Module" utility object as the first argument to make it available in the returned, public module configuration object.
 * @function buildStateModule
 * @param   {object}            module            - The shared module object to which this function will add static module data (at this point it only contains the name).
 * @param   {(object|function)} moduleInitializer - The module configuration. When it is a function it is called with the "Module" utility object and must return a plain configuration pojo.
 * @returns {object}            module            - The extended module
 * */

function buildStateModule(module, moduleInitializer) {

  // when function, we call it with STATE_MODULE namespace so that the "Module" utility namespace object is publicly available (see proto.js)
  const config = isFunction(moduleInitializer) ? moduleInitializer(STATE_MODULE) : moduleInitializer;

  if (!isPlainObject(config)) {
    throw new TypeError(`Can't create State Module "${module.name}" because the config function does not return a plain object.`);
  }

  if (!isPlainObject(config.props)) {
    throw new TypeError(`State Module requires "props" pojo containing default and optional computed properties.`);
  }

  module.defaults = {};
  module.computed = new Map();
  module.interceptors = new Map();
  module.reactions = new Map();
  module.providersToInstall = new Map();
  module.consumersOf = new Map();
  module.initialize = NOOP;
  module.actions = {};
  module.imports = config.imports;

  // 1. Split props into defaults, computed properties and injected properties.
  // Computeds and injected props are being pre-configured here as much as possible to reduce the amount of work we have to do when we're creating instances from this module.

  let prop, val;
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

      // We found a property that wants to inject data from a parent state. The source of the requested data is described in the ProviderDescription that was created when the property called Module.inject(...).
      // The data model and property of the requested data have thus been described. Here we map the name of the requesting property to the ProviderDescription:
      module.providersToInstall.set(prop, val);
      // Also extend the providerDescription with the source (we can use this later to avoid an extra loop)
      val.targetModule = module.name;
      val.targetProperty = prop;
      // We will use this mapping when this module gets instantiated: If this module has write-access to the provider (readOnly = false) we will install a strong pointer to the parent state into the consuming child instance.
      // This is very performant and safe to do because whenever a parent state loses context, so will all of the child node graphs in its descending namespace.

      // Now we also have to create the inverse relationship ie. install this module as a consumer of the providing module under the respectively mapped property names.
      // To avoid memory leaks and the need for manual disposing, the approach for the inverse is different: We will not install strong pointers of consuming child instances into providing parent instances.
      // Instead, we simply create a consumer that has the string name of the module that is consuming from it. At mutation-time a stateInstance will query its underlying module for any consumers and traverse down
      // its object-children and update any instances that match the consumer module description along the way to the furthest leaves.
      referenceConsumer(module.name, prop, val.sourceModule, val.sourceProperty);

    } else {

      module.defaults[prop] = val;

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
        module.initialize = val;
      } else {
        throw new TypeError(`"${prop}" is a reserved word for Cue State Modules and must be a function but is of type "${typeof val}"`);
      }

    } else if (isFunction(val)) {

      if (ARRAY_MUTATOR_NAMES.has(prop)) {
        throw new Error(`Illegal action name "${prop}" on "${module.name}". The action clashes with native Array.prototype.${prop}.`);
      } else {
        module.actions[prop] = val;
      }

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