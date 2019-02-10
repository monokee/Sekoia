
/**
 * Reverse engineered array mutator methods that allow for fine-grained change detection and mutation interception.
 * Implemented largely based on ECMAScript specification (where it makes sense for our purposes).
 */

function intercepted_array_fill(value, start = 0, end = this.length) {

  if (arguments.length === 0 || this.length === 0 || start === end) { // noop
    return this;
  }

  const instance = this[__CUE__];
  const array = instance.plainState;

  let hasChanged = false;

  if (value && value[__CUE__]) { // have to mount a sub-instance onto the array

    if (this.length > 1)
      throw new Error(`You can not fill an Array with multiple copies of the same state instance.`);

    const oldValue = array[0];

    if (oldValue !== value) {
      array[0] = value;
      hasChanged = true;
      value[__CUE__].instanceDidMount(array, 0);
    }

  } else { // normal fill with change detection and change event handling

    for (let i = start, oldValue; i < end; i++) {
      oldValue = array[i];
      if (oldValue !== value) {
        array[i] = value;
        hasChanged = true;
      }
    }

  }

  if (hasChanged) {
    instance.propertyDidChange();
    react();
  }

  return this;

}

function intercepted_array_push(...rest) {

  if (rest.length > 0) {

    const instance = this[__CUE__];
    const array = instance.plainState;

    for (let i = 0, value, subState; i < rest.length; i++) { // fragmented push calls to determine if added values are states that have to be mounted
      value = rest[i];
      array.push(value);
      if (value && (subState = value[__CUE__])) { // if we push subStates into the array, mount the subStates
        subState.instanceDidMount(array, i);
      }
    }

    instance.propertyDidChange();
    react();

  }

  return this.length; // comply with default push return

}

function intercepted_array_unshift(...rest) {

  if (rest.length > 0) {

    const instance = this[__CUE__];
    const array = instance.plainState;

    let i = rest.length, value, oldValue, subState;
    while (--i >= 0) { // fragmented unshift calls to know if the value added into first index needs to be mounted
      value = rest[i];
      oldValue = array[0];
      array.unshift(value);
      if (value && (subState = value[__CUE__])) { // mount if value is subState
        subState.instanceDidMount(array, 0);
      }
    }

    instance.propertyDidChange();
    react();

  }

  return this.length; // comply with default push return

}

function intercepted_array_splice(start, deleteCount, ...items) {

  const instance = this[__CUE__];
  const array = instance.plainState;

  const len = array.length;
  const actualStart = start < 0 ? Math.max((len + start), 0) : Math.min(start, len);

  let insertCount, actualDeleteCount;
  if (arguments.length === 1) {
    insertCount = 0;
    actualDeleteCount = len - actualStart;
  } else {
    insertCount = items.length;
    actualDeleteCount = Math.min(Math.max(deleteCount, 0), len - actualStart);
  }

  const deleted = [];

  // 1. delete elements from array, collected on "deleted", notify state of unmount if deleted elements are state objects. if we're deleting from an index that we will not be adding a replacement for, cue the property
  if (actualDeleteCount > 0) {

    let i = actualStart + actualDeleteCount, value, oldValue, subState;

    while (--i >= actualStart) {

      oldValue = array[i];

      if (oldValue && (subState = oldValue[__CUE__])) {
        subState.instanceWillUnmount();
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
        subState.instanceDidMount(array, arrayIndex);
      }

    }

  }

  instance.propertyDidChange();
  react();

  return deleted;

}

function intercepted_array_pop() {

  const instance = this[__CUE__];
  const array = instance.plainState;

  if (array.length === 0) {
    return undefined;
  }

  const last = array[array.length - 1];
  const subState = last ? last[__CUE__] : undefined;

  if (subState) {
    subState.instanceWillUnmount();
  }

  delete array[array.length - 1];

  instance.propertyDidChange();
  react();

  return last;

}

function intercepted_array_shift() {

  const instance = this[__CUE__];
  const array = instance.plainState;

  if (array.length === 0) {
    return undefined;
  }

  const last = array[0];
  const subState = last ? last[__CUE__] : undefined;

  if (subState) {
    subState.instanceWillUnmount();
  }

  array.shift();

  instance.propertyDidChange();
  react();

  return last;

}

function intercepted_array_copyWithin(target, start = 0, end = this.length) {

  const instance = this[__CUE__];
  const array = instance.plainState;

  const len = array.length;
  let to = target < 0 ? Math.max((len + target), 0) : Math.min(target, len);
  let from = start < 0 ? Math.max((len + start), 0) : Math.min(start, len);
  const final = end < 0 ? Math.max((len + end), 0) : Math.min(end, len);
  let count = Math.min(final - from, len - to);

  let direction;
  if (from < to && to < from + count) {
    direction = -1;
    from = from + count - 1;
    to = to + count - 1;
  } else {
    direction = 1;
  }

  let value, subState;
  while (count > 0) {
    if (from in array) {
      value = array[from];
      if (value && value[__CUE__]) {
        throw new Error(`You can't create copies of Cue State Instances via Array.prototype.copyWithin.`);
      }
      array[to] = array[from];
    } else {
      value = array[to];
      if (value && (subState = value[__CUE__])) {
        subState.instanceWillUnmount();
      }
      delete array[to];
    }
    from += direction;
    to += direction;
    count -= 1;
  }

  instance.propertyDidChange();
  react();

  return array;

}

function intercepted_array_reverse() {

  const instance = this[__CUE__];
  const array = instance.plainState;

  array.reverse();

  instance.propertyDidChange();
  react();

  return array;

}

function intercepted_array_sort(compareFunction) {

  const instance = this[__CUE__];
  const array = instance.plainState;

  array.sort(compareFunction);

  instance.propertyDidChange();
  react();

  return array;

}

// These are the only internalGetters of reactive arrays.
// We get these via function calls like we get all other internalGetters from proxyGetInterceptor.
// This avoids an additional lookup.
const ARRAY_MUTATOR_GETTERS = new Map([
  ['fill',        () => intercepted_array_fill],
  ['push',        () => intercepted_array_push],
  ['unshift',     () => intercepted_array_unshift],
  ['splice',      () => intercepted_array_splice],
  ['pop',         () => intercepted_array_pop],
  ['shift',       () => intercepted_array_shift],
  ['copyWithin',  () => intercepted_array_copyWithin],
  ['reverse',     () => intercepted_array_reverse],
  ['sort',        () => intercepted_array_sort]
]);