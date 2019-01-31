
/**
 * Adds methods and properties to a StateFactory's prototype object to make them available to all instances.
 * "this" in the methods refers to the current instance of a module.
 * @function extendStateFactoryPrototype
 * @param {function}  stateFactory  - The function that is called to create new instances of a state module.
 * @param {object}    module        - The module blueprint containing data and method objects that are shared between all instances.
 * */

function extendStateFactoryPrototype(stateFactory, module) {

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