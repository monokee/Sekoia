import { ReactiveWrapper } from "./internal/ReactiveWrapper.js";
import { ReactiveArrayInternals } from "./internal/ReactiveArrayInternals.js";
import { StateTracker } from "./internal/StateTracker.js";
import { Queue } from "./internal/Queue.js";
import { defer } from "../utils/defer.js";

export class ReactiveArray extends ReactiveWrapper {

  constructor(array, options) {
    super(new ReactiveArrayInternals(array, options));
    this._internal_.owner = this;
  }

  clone() {
    return new this.constructor(this._internal_.defaultData, {
      _model_: this._internal_.model
    });
  }

  // Accessors & Iterators

  get length() {
    return this._internal_.nativeData.length;
  }

  every(callbackFn) {
    return this._internal_.nativeData.every(callbackFn);
  }

  some(callbackFn) {
    return this._internal_.nativeData.some(callbackFn);
  }

  findIndex(callbackFn) {
    return this._internal_.nativeData.findIndex(callbackFn);
  }

  findLastIndex(callbackFn) {
    const array = this._internal_.nativeData;
    let i = array.length;
    while (i--) {
      if (callbackFn(array[i], i, array)) {
        return i;
      }
    }
    return -1;
  }

  includes(item) {
    return this._internal_.nativeData.includes(item);
  }

  indexOf(item, fromIndex) {
    return this._internal_.nativeData.indexOf(item, fromIndex);
  }

  lastIndexOf(item, fromIndex) {
    return this._internal_.nativeData.lastIndexOf(item, fromIndex);
  }

  find(callbackFn) {
    return this._internal_.nativeData.find(callbackFn);
  }

  slice(start) {
    return this._internal_.nativeData.slice(start);
  }

  forEach(callbackFn) {
    return this._internal_.nativeData.forEach(callbackFn);
  }

  filter(compareFn) {
    return this._internal_.nativeData.filter(compareFn);
  }

  map(callbackFn) {
    return this._internal_.nativeData.map(callbackFn);
  }

  reduce(reducerFn, initialValue) {
    return this._internal_.nativeData.reduce(reducerFn, initialValue);
  }

  // Mutators

  pop() {
    if (this._internal_.nativeData.length) {
      const value = this._internal_.nativeData.pop();
      this._internal_.didMutate();
      return value;
    }
  }

  push(item) {

    if (!item || item._internal_ || typeof item !== 'object') {
      this._internal_.nativeData.push(item);
    } else {
      this._internal_.nativeData.push(this._internal_.model(item));
    }

    this._internal_.didMutate();

  }

  shift() {
    if (this._internal_.nativeData.length) {
      const value = this._internal_.nativeData.shift();
      this._internal_.didMutate();
      return value;
    }
  }

  unshift(item) {

    if (!item || item._internal_ || typeof item !== 'object') {
      this._internal_.nativeData.unshift(item);
    } else {
      this._internal_.nativeData.unshift(this._internal_.model(item));
    }

    this._internal_.didMutate();

  }

  splice(start, deleteCount, ...items) {

    if (!deleteCount && !items.length) { // noop

      return [];

    } else if (!items.length) { // remove items

      const removedItems = this._internal_.nativeData.splice(start, deleteCount);
      this._internal_.didMutate();
      return removedItems;

    } else { // remove/add

      for (let i = 0; i < items.length; i++) {
        if (items[i] && !items[i]._internal_ && typeof items[i] === 'object') {
          items[i] = this._internal_.model(items[i]);
        }
      }

      const removedItems = this._internal_.nativeData.splice(start, deleteCount, ...items);
      this._internal_.didMutate();
      return removedItems;

    }

  }

  reverse() {
    if (this._internal_.nativeData.length > 1) {
      this._internal_.nativeData.reverse();
      this._internal_.didMutate();
    }
  }

  sort(compareFn) {

    const array = this._internal_.nativeData;

    if (array.length > 1) {

      const copy = array.slice(0);
      array.sort(compareFn);

      for (let i = 0; i < array.length; i++) {
        if (array[i] !== copy[i]) {
          this._internal_.didMutate();
          break;
        }
      }

    }

  }

  filterInPlace(compareFn) {

    const array = this._internal_.nativeData;

    let didChange = false;

    for (let i = array.length - 1; i >= 0; i--) {
      if (!compareFn(array[i], i, array)) {
        array.splice(i, 1);
        didChange = true;
      }
    }

    if (didChange) {
      this._internal_.didMutate();
    }

  }

  clear() {

    const array = this._internal_.nativeData;

    if (array.length) {
      while (array.length) array.pop();
      this._internal_.didMutate();
    }

  }

  // Observability

  observe(callback, options = {}) {
    if ((options.throttle || 0) > 0) {
      return this._internal_.observe('*', Queue.throttle(callback, options.throttle), options.cancelable, options.silent);
    } else if ((options.defer || 0) > 0) {
      return this._internal_.observe('*', defer(callback, options.defer), options.cancelable, options.silent);
    } else {
      return this._internal_.observe('*', callback, options.cancelable, options.silent);
    }
  }

  // Time Travel

  track(options = {}) {

    if (this._internal_.stateTracker) {
      throw new Error(`Cannot track state of ReactiveArray because it is already being tracked.`);
    }

    const tracker = this._internal_.stateTracker = new StateTracker(options.onTrack, options.maxEntries);

    // check ReactiveObject.track() for explanation
    const checkUniqueness = (options.throttle || 0) > 0 || (options.defer || 0) > 0;

    // observer immediately tracks initial state
    this._internal_.observe('*', val => tracker.add(val, checkUniqueness), false, false);

  }

  undo() {
    this.restore(this._internal_.stateTracker?.prev());
  }

  redo() {
    this.restore(this._internal_.stateTracker?.next());
  }

  restore(trackPosition) {
    const tracker = this._internal_.stateTracker;
    if (tracker && tracker.has(trackPosition)) {
      this._internal_.setData(tracker.get(trackPosition), false);
    }
  }

}