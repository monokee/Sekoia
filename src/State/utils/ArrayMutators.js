
/**
 * Reverse engineered array mutator methods that allow for fine-grained change detection and mutation interception.
 * Implemented largely based on ECMAScript specification (where it makes sense for our purposes).
 */

function intercepted_array_fill(value, start = 0, end = this.length) {

  if (arguments.length === 0 || this.length === 0 || start === end) { // noop
    return this;
  }

  const internals = this[__CUE__];
  const array = internals.plainState;

  if (typeof value === 'object' && value !== null) {
    value = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);
  }

  for (let i = start, oldValue, subInternals; i < end; i++) {
    oldValue = array[i];
    if (oldValue !== value) {
      array[i] = value;
      if (value && (subInternals = value[__CUE__]) && subInternals.mounted === false) {
        subInternals.instanceDidMount(array, i);
        createAndMountSubStates(subInternals);
      }
      internals.propertyDidChange(i);
    }
  }

  react();

  return this;

}

function intercepted_array_push(...rest) {

  if (rest.length > 0) {

    const internals = this[__CUE__];
    const array = internals.plainState;

    for (let i = 0, value, subInternals; i < rest.length; i++) {

      value = rest[i];

      if (typeof value === 'object' && value !== null) {

        subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);

        array.push(subInternals.proxyState);
        subInternals.instanceDidMount(array, array.length - 1);
        createAndMountSubStates(subInternals);

      } else {

        array.push(value);

      }

      internals.propertyDidChange(array.length - 1);

    }

    react();

  }

  return this.length; // comply with default push return

}

function intercepted_array_unshift(...rest) {

  if (rest.length > 0) {

    const internals = this[__CUE__];
    const array = internals.plainState;

    let i = rest.length, value, subInternals;
    while (--i >= 0) {

      value = rest[i];

      if (typeof value === 'object' && value !== null) {

        subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);

        if (subInternals.mounted === false) {
          array.unshift(subInternals.proxyState);
          subInternals.instanceDidMount(array, 0);
          createAndMountSubStates(subInternals);
        }

      } else {

        array.unshift(value);

      }

      internals.propertyDidChange(0);

    }

    react();

  }

  return this.length; // comply with default unshift return

}

function intercepted_array_splice(start, deleteCount, ...items) {

  const internals = this[__CUE__];
  const array = internals.plainState;

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

  const deleted = [], notified = [];

  // 1. delete elements from array, collected on "deleted", notify state of unmount if deleted elements are state objects. if we're deleting from an index that we will not be adding a replacement for, cue the property
  if (actualDeleteCount > 0) {

    let i = actualStart + actualDeleteCount, oldValue, subState;

    while (--i >= actualStart) {

      oldValue = array[i];

      if (oldValue && (subState = oldValue[__CUE__])) {
        subState.instanceWillUnmount();
      }

      array.splice(i, 1);
      internals.propertyDidChange(i);

      notified.push(i);
      deleted.push(oldValue);

    }

  }

  // 2. add elements to array, check if they have to be mounted and cue the property.
  if (insertCount > 0) {

    for (let i = 0, value, arrayIndex, subInternals; i < insertCount; i++) {

      value = items[i];
      arrayIndex = actualStart + i;

      if (typeof value === 'object' && value !== null) {

        subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);

        if (subInternals.mounted === false) {
          array.splice(arrayIndex, 0, subInternals.proxyState);
          subInternals.instanceDidMount(array, arrayIndex);
          createAndMountSubStates(subInternals);
        }

      } else {

        array.splice(arrayIndex, 0, value);

      }

      if (notified.indexOf(arrayIndex) === -1) {
        internals.propertyDidChange(arrayIndex);
      }

    }

  }

  react();

  return deleted;

}

function intercepted_array_pop() {

  const internals = this[__CUE__];
  const array = internals.plainState;

  if (array.length === 0) {
    return undefined;
  }

  const last = array[array.length - 1];
  const subInternals = last ? last[__CUE__] : undefined;

  if (subInternals) {
    subInternals.instanceWillUnmount();
  }

  delete array[array.length - 1];

  internals.propertyDidChange(array.length);
  react();

  return last;

}

function intercepted_array_shift() {

  const internals = this[__CUE__];
  const array = internals.plainState;

  if (array.length === 0) {
    return undefined;
  }

  const last = array[0];
  const subInternals = last ? last[__CUE__] : undefined;

  if (subInternals) {
    subInternals.instanceWillUnmount();
  }

  array.shift();

  internals.propertyDidChange(0);
  react();

  return last;

}

function intercepted_array_copyWithin(target, start = 0, end = this.length) {

  const internals = this[__CUE__];
  const array = internals.plainState;

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
      internals.propertyDidChange(to);
    } else {
      value = array[to];
      if (value && (subState = value[__CUE__])) {
        subState.instanceWillUnmount();
      }
      delete array[to];
      internals.propertyDidChange(to);
    }
    from += direction;
    to += direction;
    count -= 1;
  }

  react();

  return array;

}

function intercepted_array_reverse() {

  const internals = this[__CUE__];
  const array = internals.plainState;

  array.reverse();

  for (let i = 0; i < array.length; i++) {
    internals.propertyDidChange(i);
  }

  react();

  return array;

}

function intercepted_array_sort(compareFunction) {

  const internals = this[__CUE__];
  const array = internals.plainState;
  const before = array.slice();

  array.sort(compareFunction);

  for (let i = 0; i < array.length; i++) {
    if (array[i] !== before[i]) {
      internals.propertyDidChange(i);
    }
  }

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