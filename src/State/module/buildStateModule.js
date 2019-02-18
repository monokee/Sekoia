
/**
 * Creates a reusable State Module. A module is a blueprint from which factories can create instances of State.
 * When moduleInitializer argument is a function it must be called with "Module" utility object as the first argument to make it available in the returned, public module configuration object.
 * @function buildStateModule
 * @param   {object}            module            - The shared module object to which this function will add static module data (at this point it only contains the name).
 * @param   {(object|function)} moduleInitializer - The module configuration. When it is a function it is called with the "Module" utility object and must return a plain configuration pojo.
 * @returns {object}            module            - The extended module
 */

function buildStateModule(module, moduleInitializer) {

  // when function, we call it with STATE_MODULE namespace so that the "Module" utility namespace object is publicly available
  const config = isFunction(moduleInitializer) ? moduleInitializer(STATE_MODULE) : moduleInitializer;

  if (!isPlainObject(config)) {
    throw new TypeError(`Can't create State Module "${module.name}" because the config function does not return a plain object.`);
  }

  if (!isPlainObject(config.props)) {
    throw new TypeError(`State Module requires "props" pojo containing default and optional computed properties.`);
  }

  // static module properties
  module.imports = config.imports;
  module.defaults = {};
  module.initialize = NOOP;
  module.consumersOf = new Map();

  // All internal getters (extended below)
  module.internalGetters = new Map([
    ['get', () => retrieveState],
    ['set', () => applyState]
  ]);

  // All internal setters (extended below)
  module.internalSetters = new Map();

  // these have to be installed by each instance of the module on mount.
  module.derivativesToInstall = new Map();
  module.providersToInstall = new Map();


  // 1. Split props into defaults, computed properties and injected properties.
  // Computeds and injected props are being pre-configured here as much as possible to reduce the amount of work we have to do when we're creating instances from this module.

  for (const prop in config.props) {

    const val = config.props[prop];

    if (isFunction(val)) {

      module.derivativesToInstall.set(prop, {
        ownPropertyName: prop,
        computation: val,
        sourceProperties: [],
        subDerivatives: [],
        superDerivatives: []
      });

      module.internalGetters.set(prop, internals => {
        return internals.derivedProperties.get(prop).value;
      });

    } else if (val instanceof ProviderDescription) {
      // We found a property that wants to inject data from a parent state. The source of the requested data is described in the ProviderDescription that was created when the property called Module.inject(...).

      // 1. Extend the providerDescription with the source (we can use this later to avoid an extra loop)
      val.targetModule = module.name;
      val.targetProperty = prop;

      // 2. map the name of the requesting property to the ProviderDescription:
      module.providersToInstall.set(prop, val);
      // We will use this mapping when this module gets instantiated: If this module has write-access to the provider (readOnly = false) we will install a strong pointer to the parent state into the consuming child instance.

      // Now we also have to create the inverse relationship ie. install this module as a consumer of the providing module under the respectively mapped property names.
      // To avoid memory leaks and the need for manual disposing, the approach for the inverse is different: We will not install strong pointers of consuming child instances into providing parent instances.
      // Instead, we create a consumer that has the string name of the module that is consuming from it. At mutation-time a stateInstance will query its underlying module for any consumers and traverse down
      // its object-children and update any instances that match the consumer module description along the way to the furthest leaves.
      referenceConsumer(module.name, prop, val.sourceModule, val.sourceProperty);

      module.internalGetters.set(prop, internals => {
        const rootProvider = internals.providersOf.get(prop);
        return rootProvider.sourceInternals.plainState[rootProvider.sourceProperty];
      });

      if (val.readOnly === false) {

        module.internalSetters.set(prop, (internals, value) => {
          const rootProvider = internals.providersOf.get(prop);
          rootProvider.sourceInternals.proxyState[rootProvider.sourceProperty] = value;
        });

      }

    } else {

      module.defaults[prop] = val;

    }

  }

  // 2. Install dependencies of derivatives by connecting properties
  installDependencies(config.props, module.derivativesToInstall);

  // 2.1 Resolve dependencies and sort derivatives topologically
  module.derivativesToInstall = OrderedDerivatives.from(module.derivativesToInstall);

  // 3. Collect all methods except "initialize"
  for (const prop in config) {

    const val = config[prop];

    if (prop === 'initialize') {

      if (isFunction(val)) {
        module.initialize = val;
      } else {
        throw new TypeError(`"${prop}" is a reserved word for Cue State Modules and must be a function but is of type "${typeof val}"`);
      }

    } else if (isFunction(val)) {

      if (!module.internalGetters.has(prop)) {

        // create a bound-action which accumulates and releases
        module.internalGetters.set(prop, () => val);

      } else {
        throw new Error(`Module method name "${prop}" clashes with a property from "props" or with a default Cue property ("get" and "set" are reserved properties). Make sure that props and method names are distinct.`);
      }

    }

  }

  return module;

}