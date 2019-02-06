
/**
 * Creates a new instance of a State Module
 * @function createStateInstance
 * @param {function}          factory             - StateFactory function used to create this instance. We care about its prototype Object.
 * @param {object}            module              - The module blueprint containing data and method objects that are shared between all instances.
 * @param {object}            props               - Props passed to the factory function creating this instance.
 * @param {object}            [_parent]           - If known at instantiation time, the parent object graph to which the new instance is attached in the state tree.
 * @param {string}            [_ownPropertyName]  - If known at instantiation time, the property name of the new state instance on the parent object graph in the state tree.
 * @returns {object}          instance            - A new instance of the state module. Deep cloned from the defaults.
 * */

function createStateInstance(factory, module, props, _parent, _ownPropertyName) {

  // 1. Create base instance by deep cloning the default props
  const instance = oAssign(oCreate(factory.prototype), deepClonePlainObject(module.defaults));

  // 2. Create internals needed for Reactivity engine
  instance[__CUE__] = new StateInternals(instance, module, props, _parent, _ownPropertyName);

  return instance;

}