
function extendStateFactoryPrototype(stateFactory, module) {

  // These methods and properties are shared by all instances of
  // a module from the stateFactory's generic prototype object.
  // "this" in the methods refers to the current instance.

  // Computed Properties (module.computed is es6 Map to guarantee property order!)
  for (const key of module.computed.keys()) {
    oDefineProperty(stateFactory.prototype, key, {
      get() {
        return this[__CUE__].derivedProperties.get(key).value;
      },
      configurable: true,
      enumerable: true
    });
  }

  // Actions
  for (const key in module.actions) {
    stateFactory.prototype[key] = module.actions[key];
  }

  // Imports
  stateFactory.prototype.imports = module.imports;

  // (private) intercepted method cache
  stateFactory.prototype[__INTERCEPTED_METHODS__] = new Map();

}