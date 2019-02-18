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

  const internals = target[__CUE__];

  if (internals.internalSetters.has(prop)) {
    internals.internalSetters.get(prop)(internals, value);
    return true;
  }

  if (value !== internals.valueCache.get(prop)) {

    accumulationDepth++;

    if (typeof value === 'object' && value !== null) { // any object

      const subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);

      if (subInternals.mounted === false) { // something that is being set should not be mounted...
        target[prop] = subInternals.proxyState; // attach the proxy
        subInternals.instanceDidMount(target, prop); // mount the value to the target object
        createAndMountSubStates(subInternals); // mount any children of value recursively to their parents.
      } else {
        console.warn(`Can't re-mount previously mounted property "${prop}" to instance of "${internals.module.name}". This feature is not yet available.`);
      }

      internals.propertyDidChange(prop, subInternals.proxyState);
      internals.valueCache.set(prop, subInternals.proxyState);
      react();
      return true;

    } else {

      target[prop] = value;
      internals.propertyDidChange(prop, value);
      internals.valueCache.set(prop, value);
      react();
      return true;

    }

  }

}