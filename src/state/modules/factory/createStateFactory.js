
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
      statik.push.apply(statik, deepCloneStateDefaults(module.defaults));
      CueStateInternals.assignTo(statik);
      statik = wrapStateInProxy(statik);

    } else {

      StateFactory = props => {
        let instance = [];
        Object.setPrototypeOf(instance, StateFactory.prototype);
        instance.push.apply(instance, deepCloneStateDefaults(module.defaults));
        CueStateInternals.assignTo(instance);
        instance = wrapStateInProxy(instance);
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
      statik = Object.assign(
        Object.create(StateFactory.prototype),
        deepCloneStateDefaults(module.defaults)
      );
      CueStateInternals.assignTo(statik);
      statik = wrapStateInProxy(statik);

    } else {

      StateFactory = props => {
        let instance = Object.assign(
          Object.create(StateFactory.prototype),
          deepCloneStateDefaults(module.defaults)
        );
        CueStateInternals.assignTo(instance);
        instance = wrapStateInProxy(instance);
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