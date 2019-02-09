
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

  if (!target.hasOwnProperty(prop)) { // access prototype (computed/provided forwarders, actions, imports and native methods on sub-prototype)
    // this works because we throw at registration time if a custom prototype property matches array mutators!
    return ARRAY_MUTATORS[prop] || target[prop];

  } else { // ownProperty access...

    const value = target[prop];

    if (prop === __CUE__ || !value || value[__CUE__] || typeof value !== 'object') {

      return value;

    } else {

      // find the root parent that is based on a real module (ie not inheriting)
      let rootParent = target[__CUE__];
      while (rootParent.type !== STATE_TYPE_INSTANCE) rootParent = rootParent.parentInternals;
      const rootModule = rootParent.module;

      // Create a reactive state extension
      const extension = createState(isArray(value)
        ? createArrayWithCustomPrototype(value, rootModule.prototype)
        : createObjectWithCustomPrototype(value, rootModule.prototype),
        rootModule,
        STATE_TYPE_EXTENSION
      );

      // Mount the reactive extension onto the target
      target[prop] = extension.proxyState;
      extension.internals.instanceDidMount.call(extension.internals, target, prop);

      // Return the proxy
      return extension.proxyState;

    }

  }

}