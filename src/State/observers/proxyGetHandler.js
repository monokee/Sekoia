
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

  // never intercept special properties
  if (prop === __CUE__ || prop === __INTERCEPTED_METHODS__) {
    return target[prop];
  }

  if (prop === __TARGET__) {
    return target;
  }

  const internal = target[__CUE__];
  const provider = internal.providersOf.get(prop);

  if (provider) {
    const rootProvider = getRootProvider(provider);
    return rootProvider.sourceInstance.instance[rootProvider.sourceProperty];
  }

  const value = target[prop];

  // if falsy or proxy, quick return
  if (!value || value[__CUE__]) {
    return value;
  }

  // if array mutator, create/return cached intercepted mutator
  if (ARRAY_MUTATORS.has(prop) && isFunction(value)) {
    const cache = target[__INTERCEPTED_METHODS__];
    return cache.get(prop) || (cache.set(prop, createInterceptedArrayMutator(value))).get(prop);
  }

  // proxify nested objects that are not the result of a computation
  if (typeof value === 'object' && !internal.derivedProperties.has(prop)) {
    return createProxy(isArray(value)
      ? ArrayStateInternals.assignTo(value, internal.module, target, prop)
      : ObjectStateInternals.assignTo(value, internal.module, target, prop)
    );
  }

  return value;

}