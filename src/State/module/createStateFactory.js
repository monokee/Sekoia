
function createStateFactory(module) {

  let StateFactory;

  if (isArray(module.defaults)) {

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

      StateFactory.prototype = oCreate(Array.prototype);

      statik = createProxy(createStateInstance('array', StateFactory, module));

    } else {

      StateFactory = props => {

        const instance = createProxy(createStateInstance('array', StateFactory, module));

        if (module.initialize) {
          instance[__CUE__].isInitializing = true;
          module.initialize.call(instance, props);
          instance[__CUE__].isInitializing = false;
        }

        return instance;

      };

      StateFactory.prototype = oCreate(Array.prototype);

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

      statik = createProxy(createStateInstance('object', StateFactory, module));

    } else {

      StateFactory = props => {

        const instance = createProxy(createStateInstance('object', StateFactory, module));

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