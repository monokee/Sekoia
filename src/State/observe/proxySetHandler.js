
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
    const oldValue = instance.valueCache.get(prop);

    if (value) {

      const nestedInstance = value[__CUE__];

      if (nestedInstance && nestedInstance.parent === null) {
        nestedInstance.parent = target;
        nestedInstance.ownPropertyName = prop;
      }

    }

    if (value !== oldValue) {

      let inQueue = instance.attemptCue(prop, value, oldValue);

      if (instance.parent !== null) {
        const oldTarget = isArray(target) ? target.slice() : oAssign({}, target);
        inQueue += instance.parent.attemptCue.call(instance.parent, instance.ownPropertyName, target, oldTarget);
      }

      _set(target, prop, value);
      instance.valueCache.set(prop, value);

      if (inQueue > 0 && !isAccumulating) {
        react();
      }

      return true;

    }

  } else {

    console.warn(`Setting of "${prop}" ignored. Don't mutate state in a reaction. Refactor to computed properties or willChange/didChange handlers instead.`);

  }

}