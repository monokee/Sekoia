
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

  let hasChanged = false;

  if (typeof value === 'object' && value !== null) {
    value = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null);
  }

  for (let i = start, oldValue; i < end; i++) {
    oldValue = array[i];
    if (oldValue !== value) {
      array[i] = value;
      hasChanged = true;
    }
  }

  if (hasChanged) {
    internals.propertyDidChange();
    react();
  }

  return this;

}

function intercepted_array_push(...rest) {

  if (rest.length > 0) {

    const internals = this[__CUE__];
    const array = internals.plainState;

    for (let i = 0, value, subInternals; i < rest.length; i++) {

      value = rest[i];

      if (typeof value === 'object' && value !== null) {

        subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null).internals;

        if (subInternals.mounted === false) {
          array.push(subInternals.proxyState);
          subInternals.instanceDidMount(array, array.length - 1);
        }

      } else {

        array.push(value);

      }

    }

    internals.propertyDidChange();
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

        subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null).internals;

        if (subInternals.mounted === false) {
          array.unshift(subInternals.proxyState);
          subInternals.instanceDidMount(array, 0);
        }

      } else {

        array.unshift(value);

      }

    }

    internals.propertyDidChange();
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

  const deleted = [];

  // 1. delete elements from array, collected on "deleted", notify state of unmount if deleted elements are state objects. if we're deleting from an index that we will not be adding a replacement for, cue the property
  if (actualDeleteCount > 0) {

    let i = actualStart + actualDeleteCount, oldValue, subState;

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

    for (let i = 0, value, arrayIndex, subInternals; i < insertCount; i++) {

      value = items[i];
      arrayIndex = actualStart + i;

      if (typeof value === 'object' && value !== null) {

        subInternals = value[__CUE__] || createState(value, internals.module, STATE_TYPE_EXTENSION, null).internals;

        if (subInternals.mounted === false) {
          array.splice(arrayIndex, 0, subInternals.proxyState);
          subInternals.instanceDidMount(array, arrayIndex);
        }

      } else {

        array.splice(arrayIndex, 0, value);

      }

    }

  }

  internals.propertyDidChange();
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

  internals.propertyDidChange();
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

  internals.propertyDidChange();
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

  internals.propertyDidChange();
  react();

  return array;

}

function intercepted_array_reverse() {

  const internals = this[__CUE__];
  const array = internals.plainState;

  //TODO: what are the implications of this? if we're shuffling cue objects in an array we're rewriting their properties. This changes a number of things about them like: ownPropertyName, pathFromRoot
  // Additionally, if a previously mounted cue state object is being attached to a new parent, we should also be able to conveniently re-wire the objects internals.
  // unfortunately, this requires recursively re-writing all of the objects state-children as well. but I think we can do it because we only need to re-write some internal properties (paths!)
  // some checks need to be performed here that disallow re-attaching objects if they consume properties from ancestors which would no longer be ancestors after the reattachment.
  // BIG TODO.

  array.reverse();

  internals.propertyDidChange();
  react();

  return array;

}

function intercepted_array_sort(compareFunction) {

  const internals = this[__CUE__];
  const array = internals.plainState;

  array.sort(compareFunction);

  internals.propertyDidChange();
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