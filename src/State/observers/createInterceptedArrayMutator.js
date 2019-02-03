
/**
 * Creates a cache-able, intercepted array mutator function.
 * Only array mutators can mutate objects. If such a mutator is called on an observable state instance
 * we intercept the operation like any get/set/delete request to determine if we need to fire reactions.
 * Due to the "top-down" nature of methods that mutate the contents of a "container", change reactions are
 * only fired on the parent of the array. If the array doesn't have a reactive parent, we simply apply
 * the mutation and return. If it does have a reactive parent, we first determine if the mutation actually yields a
 * shallow change to the array and only then attempt to queue and react on the parent of the array.
 * @function createInterceptedArrayMutator
 * @param   {function}  nativeMethod            - the default array mutator which we are wrapping
 * @return  {function}  interceptedArrayMutator - See above.
 */
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
        // TODO: if willChange handler(s), run those, then re-evaluate, then propertyDidChange
        if (instance.parent.propertyDidChange.call(instance.parent, instance.ownPropertyName, target, oldTarget)) {
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