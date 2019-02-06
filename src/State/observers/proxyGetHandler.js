
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

  if (typeof prop === 'symbol') { // internal recursion

    // note: only other available symbol that is not explicitly checked here is __TARGET__ so we return that if the other symbols dont match.
    return prop === __CUE__ ? target[__CUE__] : prop === __INTERCEPTED_METHODS__ ? target[__INTERCEPTED_METHODS__] : target;

  } else if (!target.hasOwnProperty(prop)) { // access prototype (computed/provided forwarders, actions, imports and native methods on sub-prototype)

    // this check works because we throw at registration time if a custom prototype method matches array mutator!
    return !ARRAY_MUTATORS.has(prop)
      ? target[prop] // forward to the prototype
      : target[__INTERCEPTED_METHODS__].get(prop) || (target[__INTERCEPTED_METHODS__].set(prop, createInterceptedArrayMutator(value))).get(prop); // cache an array mutator

  } else { // ownProperty access...

    const value = target[prop];

    if (!value || value[__CUE__] || typeof value !== 'object') {
      return value;
    } else {
      return createProxy(StateInternals.assignTo(value, target[__CUE__].module, target, prop));
    }

  }

}