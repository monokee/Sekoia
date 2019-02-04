
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

  if (module.type === TYPE_OBJECT) { // if module defaults are defined as plain objects, the created instances will inherit from Object.prototype

    if (module.static) {

      let statik;

      StateFactory = props => {
        statik[__CUE__].isInitializing = true;
        module.initialize.call(statik, props);
        statik[__CUE__].isInitializing = false;
        return statik;
      };

      StateFactory.prototype = {}; // the prototype is an object (which inherits from Object.prototype)

      statik = createProxy(createStateInstance(StateFactory, module));

    } else {

      StateFactory = props => {
        const instance = createProxy(createStateInstance(StateFactory, module));
        instance[__CUE__].isInitializing = true;
        module.initialize.call(instance, props);
        instance[__CUE__].isInitializing = false;
        return instance;
      };

      StateFactory.prototype = {};

    }

  } else if (module.type === TYPE_ARRAY) { // if the module defaults are defined as an Array, the created instances will inherit from Array.prototype

    if (module.static) { // if the module is static, all instances will share the same data

      let statik;

      StateFactory = props => {
        statik[__CUE__].isInitializing = true;
        module.initialize.call(statik, props);
        statik[__CUE__].isInitializing = false;
        return statik;
      };

      StateFactory.prototype = oCreate(Array.prototype);

      statik = createProxy(createStateInstance(StateFactory, module));

    } else { // if the module is not static, instances will be deep clones of module defaults

      StateFactory = props => {
        const instance = createProxy(createStateInstance(StateFactory, module));
        instance[__CUE__].isInitializing = true;
        module.initialize.call(instance, props);
        instance[__CUE__].isInitializing = false;
        return instance;
      };

      StateFactory.prototype = oCreate(Array.prototype);

    }

  }

  // Add module properties to StateFactory.prototype
  extendStateFactoryPrototype(StateFactory, module);

  return StateFactory;

}