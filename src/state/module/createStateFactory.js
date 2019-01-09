
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

      statik = createProxy(
        CueStateInternals.assignTo(
          appendToArray(
            Object.setPrototypeOf([], StateFactory.prototype),
            deepCloneArray(module.defaults)
          )
        )
      );

    } else {

      StateFactory = props => {

        const instance = createProxy(
          CueStateInternals.assignTo(
            appendToArray(
              Object.setPrototypeOf([], StateFactory.prototype),
              deepCloneArray(module.defaults)
            )
          )
        );

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

      statik = createProxy(
        CueStateInternals.assignTo(
          Object.assign(
            Object.create(StateFactory.prototype),
            deepClonePlainObject(module.defaults)
          )
        )
      );

    } else {

      StateFactory = props => {

        const instance = createProxy( // wrap in proxy
          CueStateInternals.assignTo( // add __CUE__ instance
            Object.assign( // core object:
              Object.create(StateFactory.prototype), // extends factory proto
              deepClonePlainObject(module.defaults) // is deep clone of defaults
            )
          )
        );

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