
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

  if (prop === __CUE__)
    return target[__CUE__];
  if (prop === 'imports')
    return target[__CUE__].imports;

  const internals = target[__CUE__];

  if (internals.internalGetters.has(prop)) {
    return internals.internalGetters.get(prop)(internals);
  }

  const value = target[prop];

  if (!value || value[__CUE__] || typeof value !== 'object') {

    return value;

  } else {

    console.count('[get] create subState');

    // find the root parent that is based on a real module (ie not inheriting)
    let rootParent = target[__CUE__];
    while (rootParent.type !== STATE_TYPE_INSTANCE) {
      rootParent = rootParent.rootInternals;
    }

    // Create a reactive state extension
    const extension = createState(value, rootParent.module, STATE_TYPE_EXTENSION, null);

    // Mount the reactive extension onto the target
    target[prop] = extension.proxyState;
    extension.internals.instanceDidMount(target, prop);

    // Return the proxy
    return extension.proxyState;

  }

}