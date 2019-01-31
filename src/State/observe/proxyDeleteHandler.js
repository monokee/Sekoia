
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

      const oldValue = instance.valueCache.get(prop);

      let inQueue = instance.attemptCue(prop, undefined, oldValue);

      if (instance.parent) {
        const oldTarget = isArray(target) ? target.slice() : oAssign({}, target);
        inQueue += instance.parent.attemptCue.call(instance.parent, instance.ownPropertyName, target, oldTarget);
      }

      _delete(target, prop);
      instance.valueCache.delete(prop);

      if (inQueue > 0 && !isAccumulating) {
        react();
      }

      return true;

    }

  } else {

    console.warn(`Deletion of "${prop}" ignored. Don't mutate state in a reaction. Refactor to computed properties instead.`);

  }

}