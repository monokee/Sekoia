
/**
 * Intercept "delete" requests of properties in a reactive state object
 * @function proxyDeleteHandler
 * @param {object} target         - the state internals from which a property should be deleted.
 * @param {string} prop           - the property that should be deleted from the target.
 * @returns {(boolean|undefined)} - true if property has been deleted, else undefined.
 */
function proxyDeleteHandler(target, prop) {
  
  if (target.hasOwnProperty(prop)) {

    const internals = target[__CUE__];
    const value = target[prop];

    const subInternals = value ? value[__CUE__] : undefined;
    if (subInternals) {
      subInternals.instanceWillUnmount();
    }

    delete target[prop];
    internals.valueCache.delete(prop);
    internals.propertyDidChange.call(internals, prop, undefined);
    react();

    return true;

  }

}