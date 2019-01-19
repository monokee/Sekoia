
function extendStateFactoryPrototype(stateFactory, module) {

  // These methods and properties are shared by all instances of
  // a module from the stateFactory's generic prototype object.
  // "this" in the methods refers to the current instance.

  let key;

  // Computed Properties
  for (key in module.computed) {
    oDefineProperty(stateFactory.prototype, key, {
      get() { // forward requests to Derivative.value getter
        return this[__CUE__].derivedProperties.get(key).value;
      },
      configurable: true,
      enumerable: true
    });
  }

  // Actions
  for (key in module.actions) {
    stateFactory.prototype[key] = module.actions[key];
  }

  // Imports
  stateFactory.prototype.imports = module.imports;

  // (private) intercepted method cache
  stateFactory.prototype[__INTERCEPTED_METHODS__] = new Map();

}