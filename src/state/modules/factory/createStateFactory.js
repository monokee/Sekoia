
function createStateFactory(module) {

  let StateFactory;

  if (Array.isArray(module.defaults)) {

    if (module.static) {

      let statik = [];

      StateFactory = props => {
        if (module.initialize) {
          statik[__CUE__].isInitializing = true;
          module.initialize.call(statik, props);
          statik[__CUE__].isInitializing = false;
        }
        return statik;
      };

      StateFactory.prototype = Object.create(Array.prototype);
      Object.setPrototypeOf(statik, StateFactory.prototype);
      statik.push.apply(statik, deepCloneArray(module.defaults));
      CueStateInternals.assignTo(statik);
      statik = createProxy(statik);

    } else {

      StateFactory = props => {
        let instance = [];
        Object.setPrototypeOf(instance, StateFactory.prototype);
        instance.push.apply(instance, deepCloneArray(module.defaults));
        CueStateInternals.assignTo(instance);
        instance = createProxy(instance);
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