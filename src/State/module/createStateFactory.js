
/**
 * Creates a factory function that returns new instances of a state module.
 * @function createStateFactory
 * @param   {object} module         - The module blueprint created by "initializeStateModule"
 * @returns {function} StateFactory - A factory function that creates instances of a state module.
 * */

function createStateFactory(module) {

  /**
   * @function StateFactory
   * @params {(object|array)}   [props]   - Properties passed into the factory initializer. Like constructor params can be used to override default values during instantiation
   * @returns {(object|array)}  instance  - An instance of the state module. When module is static, instance is pointer to static module data, else deep clone of module defaults.
   * */

  const StateFactory = props => createProxy(createStateInstance(StateFactory, module, props));

  // Extend Prototype
  StateFactory.prototype = {};

  let key;

  // Computed Property forwarding
  for (key of module.computed.keys()) {

    oDefineProperty(StateFactory.prototype, key, {
      get() {
        return this[__CUE__].derivedProperties.get(key).value
      },
      set(meNot) {
        console.warn(`Can't assign "${meNot}" because "${key}" is a computed property!`);
      },
      enumerable: true
    });

  }

  // Provided Property forwarding
  let description;
  for (description of module.providersToInstall.values()) {

    if (description.readOnly === true) {

      oDefineProperty(StateFactory.prototype, description.targetProperty, {
        get() {
          const rootProvider = getRootProvider(this[__CUE__].providersOf.get(description.targetProperty));
          return rootProvider.sourceInstance.instance[rootProvider.sourceProperty];
        },
        set(meNot) {
          console.warn(`Can't assign "${meNot}" to "${description.targetProperty}" which is a "read-only" injected property.`);
        },
        enumerable: true
      });

    } else {

      oDefineProperty(StateFactory.prototype, description.targetProperty, {
        get() {
          const rootProvider = getRootProvider(this[__CUE__].providersOf.get(description.targetProperty));
          return rootProvider.sourceInstance.instance[rootProvider.sourceProperty];
        },
        set(value) {
          const rootProvider = getRootProvider(this[__CUE__].providersOf.get(description.targetProperty));
          rootProvider.sourceInstance.instance[rootProvider.sourceProperty] = value;
        },
        enumerable: true
      });

    }

  }

  // Actions
  for (key in module.actions) {
    oDefineProperty(StateFactory.prototype, key, {
      value: module.actions[key]
    });
  }

  // Imports
  oDefineProperty(StateFactory.prototype, 'imports', {
    value: module.imports
  });

  // Intercepted method cache (requires "this" so we install it privately here)
  oDefineProperty(StateFactory.prototype, __INTERCEPTED_METHODS__, {
    value: new Map()
  });

  return StateFactory;

}