
/**
 * Creates a new instance of a State Module
 * @function createStateInstance
 * @param {function}          factory             - StateFactory function used to create this instance. We care about its prototype Object (which is already inheriting from base type).
 * @param {object}            module              - The module blueprint containing data and method objects that are shared between all instances.
 * @param {object}            [_parent]           - If known at instantiation time, the parent object graph to which the new instance is attached in the state tree.
 * @param {string}            [_ownPropertyName]  - If known at instantiation time, the property name of the new state instance on the parent object graph in the state tree.
 * @returns {(object|array)}  instance            - A new instance of the state module. Deep cloned from the defaults and with the correct prototype chain for its base type.
 * */

function createStateInstance(factory, module, _parent, _ownPropertyName) {

  // 1. Create base instance by deep cloning the default props
  // 2. Create internals needed for Reactivity engine
  let instance, internal;
  if (module.type === TYPE_OBJECT) {
    instance = oAssign(oCreate(factory.prototype), deepClonePlainObject(module.defaults));
    internal = instance[__CUE__] = new ObjectStateInternals(instance, module, _parent, _ownPropertyName);
  } else if (module.type === TYPE_ARRAY) {
    instance = appendToArray(oSetPrototypeOf([], factory.prototype), deepCloneArray(module.defaults));
    internal = instance[__CUE__] = new ArrayStateInternals(instance, module, _parent, _ownPropertyName);
  }

  // 3. Create Derivatives from module blueprints
  let vDerivative, i, derivative, sourceProperty, dependencies, superDerivative;
  for (vDerivative of module.computed.values()) {

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

  }

  // 4. If parent is already available here (not guaranteed, also checked in proxy handlers)
  if (internal.parent !== null && module.providersToInstall.size) {
    injectProviders(internal, module.providersToInstall);
  }

  return instance;

}