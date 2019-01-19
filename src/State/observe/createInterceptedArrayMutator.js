
function createInterceptedArrayMutator(nativeMethod) {

  return function(...args) {

    if (!isReacting) {

      const instance = this[__CUE__];
      const target = this[__TARGET__];

      if (instance.parent === null) {
        // no parent to report changes to, exit early.
        return _apply(nativeMethod, target, args);
      }

      const oldTarget = target.slice(); // shallow clone array
      const result = _apply(nativeMethod, target, args); // apply method, potentially mutate target

      if (!areArraysShallowEqual(oldTarget, target)) {
        if (instance.parent.attemptCue.call(instance.parent, instance.ownPropertyName, target, oldTarget)) {
          if (!isAccumulating) {
            react();
          }
        }
      }

      return result;

    } else {

      console.warn(`Array mutation ignored. Don't mutate state in a reaction. Refactor to computed properties instead.`);

    }

  }

}