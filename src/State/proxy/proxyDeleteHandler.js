
/**
 * Intercept "delete" requests of properties in a reactive state object
 * @function proxyDeleteHandler
 * @param {object} target         - the state instance from which a property should be deleted.
 * @param {string} prop           - the property that should be deleted from the target.
 * @returns {(boolean|undefined)} - true if property has been deleted, else undefined.
 */
function proxyDeleteHandler(target, prop) {

  if (!isReacting) {

    if (target.hasOwnProperty(prop)) {

      const instance = target[__CUE__];

      const provider = instance.providersOf.get(prop);

      if (provider) {
        // forward the delete request to the root of the data (it will ripple back through the system from there!)
        const rootProvider = getRootProvider(provider);
        delete rootProvider.sourceInstance.plainState[rootProvider.sourceProperty];
        return true;
      }

      instance.propertyDidChange.call(instance, prop, undefined);

      delete target[prop];

      instance.valueCache.delete(prop);

      react();

      return true;

    }

  } else {

    console.warn(`Deletion of "${prop}" ignored. Don't mutate state in a reaction. Refactor to computed properties instead.`);

  }

}