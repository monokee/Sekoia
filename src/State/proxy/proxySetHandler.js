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

  // Mount unmounted sub-state
  const nestedInternals = value ? value[__CUE__] : undefined;
  if (nestedInternals && nestedInternals.mounted === false) {
    nestedInternals.instanceDidMount.call(nestedInternals, target, prop);
  }

  // Forward set requests
  if (internals.internalSetters.has(prop)) {
    internals.internalSetters.get(prop)(internals, value);
    return true;
  }

  // Handle normal set requests
  if (value !== internals.valueCache.get(prop)) {

    // mutate the target object
    target[prop] = value;

    // queue reactions
    internals.propertyDidChange.call(internals, prop, value);

    // update the cache
    internals.valueCache.set(prop, value);

    // run through all reactions in the queue
    react();

    return true;

  }

}