
function createStateFactory(module) {

  let StateFactory;

  if (Array.isArray(module.defaults)) {

    if (module.static) {

      let statik;

      StateFactory = props => {
        if (module.initialize) {
          statik[__CUE__].isInitializing = true;
          module.initialize.call(statik, props);
          statik[__CUE__].isInitializing = false;
        }
        return statik;
      };

      StateFactory.prototype = Object.create(Array.prototype);

      statik = createProxy(StateInstance.create('array', StateFactory, module));

    } else {

      StateFactory = props => {

        const instance = createProxy(StateInstance.create('array', StateFactory, module));

        if (module.initialize) {
          instance[__CUE__].isInitializing = true;
          module.initialize.call(instance, props);
          instance[__CUE__].isInitializing = false;
        }

        return instance;

      };

      StateFactory.prototype = Object.create(Array.prototype);

    }

  } else {

    if (module.static) {

      let statik;

      StateFactory = props => {
        if (module.initialize) {
          statik[__CUE__].isInitializing = true;
          module.initialize.call(statik, props);
          statik[__CUE__].isInitializing = false;
        }
        return statik;
      };

      StateFactory.prototype = {};

      statik = createProxy(StateInstance.create('object', StateFactory, module));

    } else {

      StateFactory = props => {

        const instance = createProxy(StateInstance.create('object', StateFactory, module));

        if (module.initialize) {
          instance[__CUE__].isInitializing = true;
          module.initialize.call(instance, props);
          instance[__CUE__].isInitializing = false;
        }

        return instance;

      };

      StateFactory.prototype = {};

    }

  }

  return StateFactory;

}