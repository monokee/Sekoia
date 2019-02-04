
/**
 * Intercept "set" requests of properties in a reactive state object.
 * Only sets properties when not currently reacting to state changes. Disallows and console.warns when mutating state inside of reactions.
 * Automatically assigns "parent" and "ownPropertyName" to value if value is a reactive state instance that does not yet have these required properties.
 * Compares new value to cached value before attempting to queue reactions.
 * @function proxySetHandler
 * @param   {object}            target  - The state instance on which a new or existing property is being set.
 * @param   {string}            prop    - The property that is being set.
 * @param   {*}                 value   - The value that is being assigned to target.prop.
 * @returns {(boolean|undefined)}       - True if the set operation has been successful. Undefined if not set.
 */
function proxySetHandler(target, prop, value) {

  if (!isReacting) {

    const instance = target[__CUE__];

    const provider = instance.providersOf.get(prop);

    if (provider) {
      // forward the set request to the root of the data (it will ripple back through the system from there!)
      const rootProvider = getRootProvider(provider);
      rootProvider.sourceInstance.instance[rootProvider.sourceProperty] = value;
      return true;
    }

    if (value) {

      const nestedInstance = value[__CUE__];

      if (nestedInstance && nestedInstance.parent === null) {

        nestedInstance.parent = target;
        nestedInstance.ownPropertyName = prop;

        if (nestedInstance.module.providersToInstall.size > 0) {
          injectProviders(nestedInstance, nestedInstance.providersToInstall);
        }

      }

    }

    // get old value from cache
    const oldValue = instance.valueCache.get(prop);

    // compare to cache
    if (value !== oldValue) {

      // queue reactions
      instance.propertyDidChange(prop, value, oldValue);

      // also queue reactions of the parent (when an immediate property of an object changes, the object itself has changed.) value on parent is this target object, the "oldTarget" a shallow copy of it.
      instance.parent && instance.parent.propertyDidChange.call(instance.parent, instance.ownPropertyName, target, instance.type === TYPE_OBJECT ? oAssign({}, target) : target.slice());

      // mutate the target object (this will not mutate the "oldTarget" shallow copy we created above)
      target[prop] = value;

      // update the cache
      instance.valueCache.set(prop, value);

      // run through all reactions in the queue
      react();

      // done.
      return true;

    }

  } else {

    console.warn(`Setting of "${prop}" ignored. Don't mutate state in a reaction. Refactor to computed properties or willChange/didChange handlers instead.`);

  }

}