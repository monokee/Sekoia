
function proxyGetHandler(target, prop) {

  // never intercept special properties
  if (prop === __CUE__ || prop === __INTERCEPTED_METHODS__) {
    return target[prop];
  }

  if (prop === __TARGET__) {
    return target;
  }

  const value = _get(target, prop);

  // if falsy or proxy, quick return
  if (!value || value[__CUE__]) {
    return value;
  }

  // proxify nested objects that are not the result of a computation TODO: only works for plain array and pojo objects!
  if (typeof value === 'object' && !target[__CUE__].derivedProperties.has(prop)) {
    return createProxy(StateInternals.assignTo(value, target, prop));
  }


  if (ARRAY_MUTATORS.has(prop) && isFunction(value)) {
    const cache = target[__INTERCEPTED_METHODS__];
    return cache.get(prop) || (cache.set(prop, createInterceptedArrayMutator(value))).get(prop);
  }

  return value;

}