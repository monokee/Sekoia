
function assignStateInstanceProperties(stateInstance) {

  return Object.defineProperty(stateInstance, __CUE__, {
    value: {
      uid: Symbol(),
      parent: null,
      ownPropertyName: '',
      isInitializing: false,
      fnCache: new Map(),
      valueCache: new Map(),
      observersOf: new Map(),
      derivativesOf: new Map(),
      derivedProperties: new Map(),
      attemptCue: attemptCue
    },
    configurable: true
  });

}