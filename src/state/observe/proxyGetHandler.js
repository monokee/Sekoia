
function proxyGetHandler(target, prop) {

  // never intercept special properties
  if (prop === __CUE__ || prop === __INTERCEPTED_METHODS__) {
    return target[prop];
  }

  if (prop === __TARGET__) {
    return target;
  }

  if (derivativeToConnect !== null) {
    target[__CUE__].installDerivativeOf(prop, derivativeToConnect);
    return;
  }

  const value = _get(target, prop);

  if (!value || value[__CUE__]) {
    return value;
  }

  if (isArray(value) || value.constructor === Object) {
    return wrapStateInProxy(CueStateInternals.assignTo(value, target, prop));
  }

  if (ARRAY_MUTATORS.has(prop) && typeof value === 'function') {

    return target[__INTERCEPTED_METHODS__].get(prop) || (target[__INTERCEPTED_METHODS__].set(prop, function(...args) {

      const instance = this[__CUE__];
      const target = this[__TARGET__];

      if (instance.parent === null) {
        // no parent to report changes to, exit early.
        return _apply(value, target, args);
      }

      const oldTarget = target.slice(); // shallow clone array
      const result = _apply(value, target, args); // apply method, potentially mutate target

      let didMutate = false;

      // shallow compare old and new array after mutation
      if (oldTarget.length !== target.length) {
        didMutate = true;
      } else {
        for (let i = 0; i < oldTarget.length; i++) {
          if (oldTarget[i] !== target[i]) {
            didMutate = true;
            break;
          }
        }
      }

      if (didMutate) {
        if (instance.parent.attemptCue.call(instance.parent, instance.ownPropertyName, target, oldTarget)) {
          if (!isAccumulating) {
            react();
          }
        }
      }

      return result;

    })).get(prop);

  }

  return value;

}