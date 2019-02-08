
/**
 * Creates a cache-able, intercepted array mutator function.
 * Only array mutators can mutate objects. If such a mutator is called on an observable state instance
 * we intercept the operation like any get/set/delete request to determine if we need to fire reactions.
 * Due to the "top-down" nature of methods that mutate the contents of a "container", change reactions are
 * only fired on the parent of the array. If the array doesn't have a reactive parent, we simply apply
 * the mutation and return. If it does have a reactive parent, we first determine if the mutation actually yields a
 * shallow change to the array and only then attempt to queue and react on the parent of the array.
 * @function createInterceptedArrayMutator
 * @param   {string}    methodName              - The name of the interceptor method
 * @param   {function}  nativeMethod            - The default array mutator which we are wrapping
 * @return  {function}  interceptedArrayMutator - See above.
 */
function createInterceptedArrayMutator(methodName, nativeMethod) {

  //TODO: Deprecate -> cache all array mutators statically on prototype of subStates of type Array!!!

  return function(...args) {

    if (!isReacting) {

      console.log('[array method]', nativeMethod); //TODO: if args contain instances, they have to be MOUNTED to the container they are being pushed into... we can only ever push into sub-instances

      const instance = this[__CUE__];
      const target = this[__TARGET__];

      if (instance.parentInternals === null) {
        // no parent to report changes to, exit early.
        return _apply(nativeMethod, target, args);
      }

      const oldTarget = target.slice(); // shallow clone array
      const result = _apply(nativeMethod, target, args); // apply method, potentially mutate target

      if (!areArraysShallowEqual(oldTarget, target)) {
        instance.parentInternals.propertyDidChange.call(instance.parentInternals, instance.ownPropertyName, target, oldTarget);
        react();
      }

      return result;

    } else {



    }

  }

}

/**
 * Reverse engineered array mutator methods that allow for fine-grained mutation interception.
 */

const ARRAY_MUTATORS = new Map();

ARRAY_MUTATORS.set('fill', function fill(value, start = 0, end = this.length) {

  if (isReacting) {
    console.warn(MUTATION_WHILE_REACTING_WARNING);
    return;
  }

  if (arguments.length === 0 || this.length === 0 || start === end) { // noop
    return this;
  }

  const instance = this[__CUE__];
  const array = instance.plainState;

  if (value && value[__CUE__]) { // have to mount a sub-instance onto the array

    if (this.length > 1)
      throw new Error(`You can not fill an Array with multiple copies of the same state instance.`);

    const oldValue = array[0];

    if (oldValue !== value) {
      array[0] = value;
      value[__CUE__].subInstanceDidMount.call(value[__CUE__], array, 0);
      if (instance.parentInternals) {
        instance.parentInternals.propertyDidChange.call(instance.parentInternals, instance.ownPropertyName, array, [oldValue]);
      }
    }

  } else { // normal fill with change detection and change event handling

    const oldArray = array.slice();

    let hasChanged = false;
    for (let i = start, oldValue; i < end; i++) {
      oldValue = array[i];
      if (oldValue !== value) {
        array[i] = value;
        hasChanged = true;
      }
    }

    if (hasChanged && instance.parentInternals && instance.parentInternals[__IS_STATE_INTERNAL__]) {
      instance.parentInternals.propertyDidChange.call(instance.parentInternals, instance.ownPropertyName, array, oldArray);
    }

  }

  react();

  return this;

});

ARRAY_MUTATORS.set('push', function push(...rest) {

  if (isReacting) {
    console.warn(MUTATION_WHILE_REACTING_WARNING);
    return;
  }

  if (rest.length > 0) {

    const instance = this[__CUE__];
    const array = instance.plainState;
    const oldArray = instance.parentInternals && instance.parentInternals[__IS_STATE_INTERNAL__] ? array.slice() : undefined;

    for (let i = 0, value, subState; i < rest.length; i++) { // fragmented push calls to determine if added values are states that have to be mounted
      value = rest[i];
      array.push(value);
      if (value && (subState = value[__CUE__])) { // if we push subStates into the array, mount the subStates
        subState.subInstanceDidMount.call(subState, array, i);
      }
    }

    if (oldArray) { // raise change event on parent
      instance.parentInternals.propertyDidChange.call(instance.parentInternals, instance.ownPropertyName, array, oldArray);
    }

    react();

  }

  return this.length; // comply with default push return

});

ARRAY_MUTATORS.set('unshift', function unshift(...rest) {

  if (isReacting) {
    console.warn(MUTATION_WHILE_REACTING_WARNING);
    return;
  }

  if (rest.length > 0) {

    const instance = this[__CUE__];
    const array = instance.plainState;
    const oldArray = instance.parentInternals && instance.parentInternals[__IS_STATE_INTERNAL__] ? array.slice() : undefined;

    let i = rest.length, value, oldValue, subState;
    while (--i >= 0) { // fragmented unshift calls to know if the value added into first index needs to be mounted
      value = rest[i];
      oldValue = array[0];
      array.unshift(value);
      if (value && (subState = value[__CUE__])) { // mount if value is subState
        subState.subInstanceDidMount.call(subState, array, 0);
      }
    }

    if (oldArray) { // raise change event on parent
      instance.parentInternals.propertyDidChange.call(instance.parentInternals, instance.ownPropertyName, array, oldArray);
    }

    react();

  }

  return this.length; // comply with default push return

});

ARRAY_MUTATORS.set('splice', function splice(start, deleteCount, ...items) {

  if (isReacting) {
    console.warn(MUTATION_WHILE_REACTING_WARNING);
    return;
  }

  if (arguments.length === 0) {
    return [];
  }

  const instance = this[__CUE__];
  const array = instance.plainState;
  const oldArray = instance.parentInternals && instance.parentInternals[__IS_STATE_INTERNAL__] ? array.slice() : undefined;

  const relativeStart = parseInt(start);
  const actualStart = relativeStart < 0 ? Math.max((array.length + relativeStart), 0) : Math.min(relativeStart, array.length);

  let insertCount, actualDeleteCount, dc;
  if (arguments.length === 1) {
    insertCount = 0;
    actualDeleteCount = array.length - actualStart;
  } else {
    insertCount = items.length;
    dc = parseInt(deleteCount);
    actualDeleteCount = Math.min(Math.max(dc, 0), array.length - actualStart);
  }

  const deleted = [];

  // 1. delete elements from array, collected on "deleted", notify state of unmount if deleted elements are state objects. if we're deleting from an index that we will not be adding a replacement for, cue the property
  if (actualDeleteCount > 0) {

    let i = actualStart + actualDeleteCount, value, oldValue, subState;

    while (--i >= actualStart) {

      oldValue = array[i];

      if (oldValue && (subState = oldValue[__CUE__])) {
        subState.instanceWillUnmount.call(subState);
      }

      array.splice(i, 1);

      deleted.push(oldValue);

    }

  }

  // 2. add elements to array, check if they have to be mounted and cue the property.
  if (insertCount > 0) {

    for (let i = 0, value, arrayIndex, oldValue, subState; i < insertCount; i++) {

      value = items[i];
      arrayIndex = actualStart + i;

      array.splice(arrayIndex, 0, value);

      if (value && (subState = value[__CUE__])) { // if we splice subStates into the array, mount the subStates
        subState.subInstanceDidMount.call(subState, array, arrayIndex);
      }

    }

  }

  // 3. cue the parent
  if (oldArray) { // raise change event on parent
    instance.parentInternals.propertyDidChange.call(instance.parentInternals, instance.ownPropertyName, array, oldArray);
  }

  react();

  return deleted;

});

ARRAY_MUTATORS.set('pop', function pop() {

  if (isReacting) {
    console.warn(MUTATION_WHILE_REACTING_WARNING);
    return;
  }

  const instance = this[__CUE__];
  const array = instance.plainState;

  if (array.length === 0) {
    return undefined;
  }

  const last = array[array.length - 1];
  const subState = last ? last[__CUE__] : undefined;
  const oldArray = instance.parentInternals && instance.parentInternals[__IS_STATE_INTERNAL__] ? array.slice() : undefined;

  if (subState) {
    subState.instanceWillUnmount.call(subState);
  }

  delete array[array.length - 1];

  if (oldArray) {
    instance.parentInternals.propertyDidChange.call(instance.parentInternals, instance.ownPropertyName, array, oldArray);
  }

  return last;

});

ARRAY_MUTATORS.set('shift', function shift() {

  if (isReacting) {
    console.warn(MUTATION_WHILE_REACTING_WARNING);
    return;
  }

  const instance = this[__CUE__];
  const array = instance.plainState;

  if (array.length === 0) {
    return undefined;
  }

  const last = array[0];
  const subState = last ? last[__CUE__] : undefined;
  const oldArray = instance.parentInternals && instance.parentInternals[__IS_STATE_INTERNAL__] ? array.slice() : undefined;

  if (subState) {
    subState.instanceWillUnmount.call(subState);
  }

  array.shift();

  if (oldArray) {
    instance.parentInternals.propertyDidChange.call(instance.parentInternals, instance.ownPropertyName, array, oldArray);
  }

  return last;

});

ARRAY_MUTATORS.set('copyWithin', function copyWithin(target, start = 0, end = this.length) {

});

ARRAY_MUTATORS.set('reverse', function reverse() {

});

ARRAY_MUTATORS.set('sort', function(compareFunction) {

});







