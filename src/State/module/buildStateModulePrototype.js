
/**
 * Creates a prototype object on a state module that instances of the module will inherit from.
 * @param   {object} module     - The module blueprint created by "buildStateModule"
 * @returns {object} prototype  - The prototype object we also attached to module
 */
function buildStateModulePrototype(module) {

  const prototype = module.prototype = {};

  // Computed Property forwarding
  for (const computedProp of module.computed.keys()) {

    oDefineProperty(prototype, computedProp, {
      get() {
        return this[__CUE__].derivedProperties.get(computedProp).value
      },
      set(meNot) {
        console.warn(`Can't assign "${meNot}" because "${computedProp}" is a computed property!`);
      },
      enumerable: true
    });

  }

  // Provided Property forwarding
  for (const description of module.providersToInstall.values()) {

    if (description.readOnly === true) {

      oDefineProperty(prototype, description.targetProperty, {
        get() {
          const rootProvider = getRootProvider(this[__CUE__].providersOf.get(description.targetProperty));
          return rootProvider.sourceInstance.plainState[rootProvider.sourceProperty]; // get data from plain state
        },
        set(meNot) {
          console.warn(`Can't mutate "${description.targetProperty}" which is a "read-only" injected property. Setting ignored.`, meNot);
        },
        enumerable: true
      });

    } else {

      oDefineProperty(prototype, description.targetProperty, {
        get() {
          const rootProvider = getRootProvider(this[__CUE__].providersOf.get(description.targetProperty));
          return rootProvider.sourceInstance.plainState[rootProvider.sourceProperty]; // get data from plain state
        },
        set(value) {
          const rootProvider = getRootProvider(this[__CUE__].providersOf.get(description.targetProperty));
          rootProvider.sourceInstance.proxyState[rootProvider.sourceProperty] = value; // set data on proxy state for reactivity
        },
        enumerable: true
      });

    }

  }

  // Actions
  for (const methodName in module.actions) {
    oDefineProperty(prototype, methodName, {
      value: module.actions[methodName]
    });
  }

  // Default functions and properties that will be shared from the prototype of each instance.
  oDefineProperties(prototype, {

    imports: {
      value: module.imports
    },

    get: {
      value: function(asJSON) {
        return this[__CUE__].retrieveState(asJSON);
      }
    },

    set: {
      value: function(props) {
        this[__CUE__].applyState(props);
      }
    }

  });

  return prototype;

}