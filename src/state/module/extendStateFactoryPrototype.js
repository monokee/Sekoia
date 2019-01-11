
function extendStateFactoryPrototype(stateFactory, module) {

  // These methods and properties are shared by all instances of
  // a module from the stateFactory's generic prototype object.
  // "this" in the methods refers to the current instance.

  let key;

  // Computed Properties as Getters
  for (key in module.computed) {
    Object.defineProperty(stateFactory.prototype, key, {
      get() {
        return this[__CUE__].derivedProperties.get(key).value
      },
      configurable: true
    });
  }

  // Actions
  for (key in module.actions) {
    Object.defineProperty(stateFactory.prototype, key, {
      value: module.actions[key],
      configurable: true
    });
  }

  // Other Properties shared on the Prototype
  Object.defineProperties(stateFactory.prototype, {

    // public
    imports: {
      value: module.imports,
      configurable: true
    },

    // private
    [__INTERCEPTED_METHODS__]: {
      value: new Map(),
      configurable: true
    }

  });

}