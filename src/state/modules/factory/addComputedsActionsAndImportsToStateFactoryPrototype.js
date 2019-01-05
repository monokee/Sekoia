
function addComputedsActionsAndImportsToFactoryPrototype(stateFactory, module) {

  let key;

  // Computed Properties as Getters
  for (key in module.computed) {
    Object.defineProperty(stateFactory.prototype, key, {
      get() { return this[__CUE__].derivedProperties.get(key).value },
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

  // Imports
  Object.defineProperty(stateFactory.prototype, 'imports', {
    value: module.imports,
    configurable: true
  });

}