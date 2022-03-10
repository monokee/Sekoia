import { ReactiveWrapper } from "./internal/ReactiveWrapper.js";
import { ReactiveArrayInternals } from "./internal/ReactiveArrayInternals.js";
import { StateTracker } from "./internal/StateTracker.js";
import { Queue } from "./internal/Queue.js";
import { defer } from "../utils/defer.js";

export class ReactiveArray extends ReactiveWrapper {

  constructor(array, options) {
    super(new ReactiveArrayInternals(array, options));
    this.$$.owner = this;
  }

  clone() {
    return new this.constructor(this.$$.defaultData, {
      _model_: this.$$.model
    });
  }

  // Accessors & Iterators

  get length() {
    return this.$$.nativeData.length;
  }

  every(callbackFn) {
    return this.$$.nativeData.every(callbackFn);
  }

  some(callbackFn) {
    return this.$$.nativeData.some(callbackFn);
  }

  findIndex(callbackFn) {
    return this.$$.nativeData.findIndex(callbackFn);
  }

  findLastIndex(callbackFn) {
    const array = this.$$.nativeData;
    let i = array.length;
    while (i--) {
      if (callbackFn(array[i], i, array)) {
        return i;
      }
    }
    return -1;
  }

  includes(item) {
    return this.$$.nativeData.includes(item);
  }

  indexOf(item, fromIndex) {
    return this.$$.nativeData.indexOf(item, fromIndex);
  }

  lastIndexOf(item, fromIndex) {
    return this.$$.nativeData.lastIndexOf(item, fromIndex);
  }

  find(callbackFn) {
    return this.$$.nativeData.find(callbackFn);
  }

  slice(start) {
    return this.$$.nativeData.slice(start);
  }

  concat(...arrays) {
    return this.$$.nativeData.concat(...arrays);
  }

  forEach(callbackFn) {
    return this.$$.nativeData.forEach(callbackFn);
  }

  filter(compareFn) {
    return this.$$.nativeData.filter(compareFn);
  }

  map(callbackFn) {
    return this.$$.nativeData.map(callbackFn);
  }

  reduce(reducerFn, initialValue) {
    return this.$$.nativeData.reduce(reducerFn, initialValue);
  }

  // Mutators

  pop() {
    if (this.$$.nativeData.length) {
      const value = this.$$.nativeData.pop();
      this.$$.didMutate();
      return value;
    }
  }

  push(...items) {
    this.$$.nativeData.push(...this.$$.internalize(items));
    this.$$.didMutate();
  }

  shift() {
    if (this.$$.nativeData.length) {
      const value = this.$$.nativeData.shift();
      this.$$.didMutate();
      return value;
    }
  }

  unshift(...items) {
    this.$$.nativeData.unshift(...this.$$.internalize(items));
    this.$$.didMutate();
  }

  splice(start, deleteCount, ...items) {

    if (!deleteCount && !items.length) { // noop

      return [];

    } else if (!items.length) { // remove items

      const removedItems = this.$$.nativeData.splice(start, deleteCount);
      this.$$.didMutate();
      return removedItems;

    } else { // remove/add

      const removedItems = this.$$.nativeData.splice(start, deleteCount, ...this.$$.internalize(items));
      this.$$.didMutate();
      return removedItems;

    }

  }

  reverse() {
    if (this.$$.nativeData.length > 1) {
      this.$$.nativeData.reverse();
      this.$$.didMutate();
    }
  }

  sort(compareFn) {

    const array = this.$$.nativeData;

    if (array.length > 1) {

      const copy = array.slice(0);
      array.sort(compareFn);

      for (let i = 0; i < array.length; i++) {
        if (array[i] !== copy[i]) {
          this.$$.didMutate();
          break;
        }
      }

    }

  }

  filterInPlace(compareFn) {

    const array = this.$$.nativeData;

    let didChange = false;

    for (let i = array.length - 1; i >= 0; i--) {
      if (!compareFn(array[i], i, array)) {
        array.splice(i, 1);
        didChange = true;
      }
    }

    if (didChange) {
      this.$$.didMutate();
    }

  }

  concatInPlace(array, prepend = false) {

    if (array?.length) {

      if (prepend) {
        this.$$.nativeData.unshift(...this.$$.internalize(array));
      } else {
        this.$$.nativeData.push(...this.$$.internalize(array));
      }

      this.$$.didMutate();

    }

  }

  clear() {

    const array = this.$$.nativeData;

    if (array.length) {
      while (array.length) array.pop();
      this.$$.didMutate();
    }

  }

  // Observability

  observe(callback, options = {}) {
    if ((options.throttle || 0) > 0) {
      return this.$$.observe('*', Queue.throttle(callback, options.throttle), options.cancelable, options.silent);
    } else if ((options.defer || 0) > 0) {
      return this.$$.observe('*', defer(callback, options.defer), options.cancelable, options.silent);
    } else {
      return this.$$.observe('*', callback, options.cancelable, options.silent);
    }
  }

  // Time Travel

  track(options = {}) {

    if (this.$$.stateTracker) {
      throw new Error(`Cannot track state of ReactiveArray because it is already being tracked.`);
    }

    const tracker = this.$$.stateTracker = new StateTracker(options.onTrack, options.maxEntries);

    // check ReactiveObject.track() for explanation
    const checkUniqueness = (options.throttle || 0) > 0 || (options.defer || 0) > 0;

    // observer immediately tracks initial state
    this.$$.observe('*', val => tracker.add(val, checkUniqueness), false, false);

  }

  undo() {
    this.restore(this.$$.stateTracker?.prev());
  }

  redo() {
    this.restore(this.$$.stateTracker?.next());
  }

  restore(trackPosition) {
    const tracker = this.$$.stateTracker;
    if (tracker && tracker.has(trackPosition)) {
      this.$$.setData(tracker.get(trackPosition), false);
    }
  }

}