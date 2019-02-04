
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

  let StateFactory;

  if (module.static) {

    let statik, internal;

    StateFactory = props => {
      internal.isInitializing = true;
      module.initialize.call(statik, props);
      internal.isInitializing = false;
      return statik;
    };

    StateFactory.prototype = {}; // the prototype is an object (which inherits from Object.prototype)

    statik = createProxy(createStateInstance(StateFactory, module));
    internal = statik[__CUE__];

  } else {

    StateFactory = props => {
      const instance = createProxy(createStateInstance(StateFactory, module));
      const internal = instance[__CUE__];
      internal.isInitializing = true;
      module.initialize.call(instance, props);
      internal.isInitializing = false;
      return instance;
    };

    StateFactory.prototype = {};

  }


  // Add module properties to StateFactory.prototype
  extendStateFactoryPrototype(StateFactory, module);

  return StateFactory;

}