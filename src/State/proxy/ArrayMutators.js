
/**
 * Reverse engineered array mutator methods that allow for fine-grained change detection and mutation interception.
 * Implemented mostly based on ECMA specifications where it makes sense for our purposes.
 * // TODO: should sub-state arrays have an internal valueCache ?
 */
const ARRAY_MUTATORS = {

  fill(value, start = 0, end = this.length) {

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
        value[__CUE__].instanceDidMount.call(value[__CUE__], array, 0);
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
      instance.propertyDidChange.call(instance); // no need to pass anything specific
      react();
    }

    return this;

  },

  push(...rest) {

    if (rest.length > 0) {

      const instance = this[__CUE__];
      const array = instance.plainState;

      for (let i = 0, value, subState; i < rest.length; i++) { // fragmented push calls to determine if added values are states that have to be mounted
        value = rest[i];
        array.push(value);
        if (value && (subState = value[__CUE__])) { // if we push subStates into the array, mount the subStates
          subState.instanceDidMount.call(subState, array, i);
        }
      }

      instance.propertyDidChange.call(instance);
      react();

    }

    return this.length; // comply with default push return

  },

  unshift(...rest) {

    if (rest.length > 0) {

      const instance = this[__CUE__];
      const array = instance.plainState;

      let i = rest.length, value, oldValue, subState;
      while (--i >= 0) { // fragmented unshift calls to know if the value added into first index needs to be mounted
        value = rest[i];
        oldValue = array[0];
        array.unshift(value);
        if (value && (subState = value[__CUE__])) { // mount if value is subState
          subState.instanceDidMount.call(subState, array, 0);
        }
      }

      instance.propertyDidChange.call(instance);
      react();

    }

    return this.length; // comply with default push return

  },

  splice(start, deleteCount, ...items) {

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
          subState.instanceDidMount.call(subState, array, arrayIndex);
        }

      }

    }

    instance.propertyDidChange.call(instance);
    react();

    return deleted;

  },

  pop() {

    const instance = this[__CUE__];
    const array = instance.plainState;

    if (array.length === 0) {
      return undefined;
    }

    const last = array[array.length - 1];
    const subState = last ? last[__CUE__] : undefined;

    if (subState) {
      subState.instanceWillUnmount.call(subState);
    }

    delete array[array.length - 1];

    instance.propertyDidChange.call(instance);
    react();

    return last;

  },

  shift() {

    const instance = this[__CUE__];
    const array = instance.plainState;

    if (array.length === 0) {
      return undefined;
    }

    const last = array[0];
    const subState = last ? last[__CUE__] : undefined;

    if (subState) {
      subState.instanceWillUnmount.call(subState);
    }

    array.shift();

    instance.propertyDidChange.call(instance);
    react();

    return last;

  },

  copyWithin(target, start = 0, end = this.length) {

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
          subState.instanceWillUnmount.call(subState);
        }
        delete array[to];
      }
      from += direction;
      to += direction;
      count -= 1;
    }

    instance.propertyDidChange.call(instance);
    react();

    return array;

  },

  reverse() {

    const instance = this[__CUE__];
    const array = instance.plainState;

    array.reverse();

    instance.propertyDidChange.call(instance);
    react();

    return array;

  },

  sort(compareFunction) {

    const instance = this[__CUE__];
    const array = instance.plainState;

    array.sort(compareFunction);

    instance.propertyDidChange.call(instance);
    react();

    return array;

  }

};