import { ReactiveObjectModel } from "./internal/ReactiveObjectModel.js";
import { ReactiveObjectInternals } from "./internal/ReactiveObjectInternals.js";
import { ReactiveWrapper } from "./internal/ReactiveWrapper.js";
import { StateTracker } from "./internal/StateTracker.js";
import { defer } from "../utils/defer.js";
import { Queue } from "./internal/Queue.js";

export class ReactiveObject extends ReactiveWrapper {

  static _from_(model, data) {

    const clone = Object.create(ReactiveObject.prototype);
    clone.$$ = new ReactiveObjectInternals(model);
    clone.$$.owner = clone;

    if (data) {
      clone.$$.setData(data, true);
    }

    return clone;

  }

  constructor(properties) {
    const model = new ReactiveObjectModel(properties);
    const internals = new ReactiveObjectInternals(model);
    super(internals);
    internals.owner = this;
  }

  clone(data) {
    return this.constructor._from_(this.$$.model, data);
  }

  observe(key, callback, options = {}) {

    if (typeof key === 'object') {

      // { ...key: callback } -> convenient but non cancelable, non silent
      for (const k in key) {
        if (key.hasOwnProperty(k)) {
          this.$$.observe(k, key[k], false, false);
        }
      }

    } else {

      if ((options.throttle || 0) > 0) {

        return this.$$.observe(key, Queue.throttle(callback, options.throttle), options.cancelable, options.silent);

      } else if ((options.defer || 0) > 0) {

        return this.$$.observe(key, defer(callback, options.defer), options.cancelable, options.silent);

      } else {

        return this.$$.observe(key, callback, options.cancelable, options.silent);

      }

    }

  }

  bind(key) {
    return this.$$.bind(key);
  }

  track(key, options = {}) {

    key || (key = '*');

    const stateTrackers = this.$$.stateTrackers || (this.$$.stateTrackers = new Map());

    if (stateTrackers.has(key)) {
      throw new Error(`Cannot track state of "${key}" because the property is already being tracked.`);
    } else if (this.$$.computedProperties.has(key)) {
      throw new Error(`Cannot track computed property "${key}". Only track writable properties.`);
    }

    const tracker = new StateTracker(options.onTrack, options.maxEntries);
    stateTrackers.set(key, tracker);

    // when tracking is throttled or deferred we have to check if the latest value
    // is different than the last value that was added to the tracker. this is because
    // state change detection is synchronous but when throttling or deferring, we might
    // trigger intermediate state changes but finally land on the initial state. By
    // setting a flag at install time we can avoid this check for all synchronous trackers.
    const checkUniqueness = (options.throttle || 0) > 0 || (options.defer || 0) > 0;

    // observer immediately tracks initial state
    return this.observe(key, val => tracker.add(val, checkUniqueness), options);

  }

  undo(key) {
    key || (key = '*');
    this.restore(key, this.$$.stateTrackers?.get(key)?.prev());
  }

  redo(key) {
    key || (key = '*');
    this.restore(key, this.$$.stateTrackers?.get(key)?.next());
  }

  restore(key, trackPosition) {

    if (trackPosition === void 0 && typeof key === 'number') {
      trackPosition = key;
      key = '*';
    }

    const tracker = this.$$.stateTrackers?.get(key);

    if (tracker && tracker.has(trackPosition)) {
      if (key === '*') {
        this.$$.setData(tracker.get(trackPosition), false);
      } else {
        this.$$.setDatum(key, tracker.get(trackPosition), false);
      }
    }

  }

}