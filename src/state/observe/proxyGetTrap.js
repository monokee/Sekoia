
function proxyGetTrap(target, prop) {

  // never intercept instance
  if (prop === __CUE__) return target[__CUE__];

  const instance = target[__CUE__];

  if (derivativeToConnect !== null) {

    // install it as a derivative of the "gotten" property on the model
    if (instance.derivativesOf.has(prop)) {
      instance.derivativesOf.get(prop).push(derivativeToConnect);
    } else {
      instance.derivativesOf.set(prop, [ derivativeToConnect ]);
    }

    // add the "gotten" property key to the derivatives' dependencies
    if (derivativeToConnect.dependencies.indexOf(prop) === -1) {
      derivativeToConnect.dependencies.push(prop);
    }

    // if the "gotten" property is a derivative itself, we install the derivativeToConnect
    // as a derivative of the "gotten" derivative, and the "gotten" property as a
    // superDerivative of derivativeToConnect allowing for "self-aware" traversal in both directions.
    const thisDerivative = instance.derivedProperties.get(prop);

    if (thisDerivative) {

      if (thisDerivative.derivatives.indexOf(derivativeToConnect) === -1) {
        thisDerivative.derivatives.push(derivativeToConnect);
      }

      if (derivativeToConnect.superDerivatives.indexOf(thisDerivative) === -1) {
        derivativeToConnect.superDerivatives.push(thisDerivative);
      }

    }

    return;

  }

  const value = _get(target, prop);

  // never intercept falsy values, nested cue states or the prototype
  if (!value || value[__CUE__] || !target.hasOwnProperty(prop)) return value;

  if (isArray(value) || value.constructor === Object) {
    // recursively proxify nested arrays and objects
    return wrapStateInProxy(assignStateInstanceProperties(value));
  }

  //TODO: this has to be guarded against methods on prototype.
  //TODO: mmh. both array mutators and modules actions live on the prototype.
  //TODO: and both have the potential to mutate the state.
  // TODO: function caching is the wrong approach here. why?
  // because that would create one intercepted method for every method on the objects prototype and cache it on every instance...
  // the stateFactory should instead have the fnCache on its prototype so that it is not recreated per instance!

  if (typeof value === 'function') {

    return instance.fnCache.get(prop) || (instance.fnCache.set(prop, (...args) => {

      if (!ARRAY_MUTATORS.has(prop) || instance.parent === null) {
        // mutation via methods means we only react on the parent
        // if method is not array mutator or instance doesn't have parent to react on
        // we only apply the function and the return the result.
        return _apply(value, target, args);
      }

      // create shallow target of the array
      const oldTarget = target.slice();
      const result = _apply(value, target, args);

      let didMutate = false;

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