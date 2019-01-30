
function createStateInstance(type, factory, module, _parent, _ownPropertyName) {

  // 1. Create base instance
  const instance = type === 'object'
    ? oAssign(oCreate(factory.prototype), deepClonePlainObject(module.defaults))
    : appendToArray(oSetPrototypeOf([], factory.prototype), deepCloneArray(module.defaults));

  // 2. Assign Internals (__CUE__)
  const internal = instance[__CUE__] = new StateInternals(_parent, _ownPropertyName);

  // 3. Create Derivatives from module blueprints
  let i, derivative, sourceProperty, dependencies, superDerivative;
  module.computed.forEach(vDerivative => {

    // 3.0 Create instance
    derivative = new Derivative(vDerivative.ownPropertyName, vDerivative.computation, vDerivative.sourceProperties);

    // 3.1 Install instance as derivedProp
    internal.derivedProperties.set(vDerivative.ownPropertyName, derivative);

    // 3.2 Add derivative as derivativeOf of its sourceProperties (dependencyGraph)
    for (i = 0; i < vDerivative.sourceProperties.length; i++) {
      sourceProperty = vDerivative.sourceProperties[i];
      dependencies = internal.derivativesOf.get(sourceProperty);
      if (dependencies) {
        dependencies.push(derivative);
      } else {
        internal.derivativesOf.set(sourceProperty, [ derivative ]);
      }
    }

    // 3.3 Enhance Derivative for self-aware traversal
    for (i = 0; i < vDerivative.superDerivatives.length; i++) {
      // because the module derivatives are topologically sorted, we know that the superDerivative is available
      superDerivative = internal.derivedProperties.get(vDerivative.superDerivatives[i].ownPropertyName);
      derivative.superDerivatives.push(superDerivative);
      superDerivative.subDerivatives.push(derivative);
    }

    // 3.4 Fill internal cache of Derivative
    // (instance inherits from factory.prototype which contains forwarding-getters which trigger value computation in Derivative)
    derivative.fillCache(instance);

  });

  // 4. Return
  return instance;

}