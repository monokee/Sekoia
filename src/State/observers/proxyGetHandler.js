
/**
 * Intercept "get" requests of properties in a reactive state object.
 * When prop is special symbol key, interceptor can return special data for recursive access etc.
 * Auto-wraps any sub-objects (Plain Objects and Arrays) into reactive proxies (unless they are the result of a computation).
 * Auto-creates -and caches intercepted array mutator functions when the get request is to an array mutator.
 * @function proxyGetHandler
 * @param   {object}            target  - The state instance from which a property is being requested.
 * @param   {(string|symbol)}   prop    - The property that is being requested.
 * @returns {*}                 value   - Either the plain state value or a special value when get request has been made to an internal symbol.
 */
function proxyGetHandler(target, prop) {

  if (typeof prop === 'symbol') { // quick internal returns

    // note: only other available symbol that is not explicitly checked here is __TARGET__ so we return that if the other symbols dont match.
    return prop === __CUE__ ? target[__CUE__] : prop === __INTERCEPTED_METHODS__ ? target[__INTERCEPTED_METHODS__] : target;

  } else if (!target.hasOwnProperty(prop)) { // quick prototype access

    // this check works because we throw at registration time if a custom prototype method matches array mutator!
    return !ARRAY_MUTATORS.has(prop)
      ? target[prop] // forward to the prototype
      : target[__INTERCEPTED_METHODS__].get(prop) || (target[__INTERCEPTED_METHODS__].set(prop, createInterceptedArrayMutator(value))).get(prop); // cache an array mutator

  } else { // ownProperty access...

    const internal = target[__CUE__];
    const provider = internal.providersOf.get(prop);

    if (provider) { // forward get to root provider
      const rootProvider = getRootProvider(provider);
      return rootProvider.sourceInstance.instance[rootProvider.sourceProperty];
    }

    const value = target[prop];

    // if value is falsy or value has cue instance, return value.
    // if value is object that is not computed, wrap object and return proxy.
    // else return value.
    return !value || value[__CUE__]
      ? value
      : typeof value === 'object' && !internal.derivedProperties.has(prop)
        ? createProxy(StateInternals.assignTo(value, internal.module, target, prop))
        : value;

  }

}