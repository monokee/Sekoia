import { Queue } from "./Queue.js";
import { deepClone } from "../../utils/deep-clone.js";
import { NOOP } from "./Noop.js";

export class ReactiveArrayInternals {

  constructor(sourceArray, options) {

    sourceArray || (sourceArray = []);

    this.nativeData =  sourceArray;

    if (options?._model_) { // reuse (cloning)

      this.model = options._model_;

    } else if (typeof options?.model === 'function') {

      this.model = data => {
        const model = options.model(data);
        if (model?.$$) {
          model.$$.parentInternals = this;
        }
        return model;
      }

    } else {

      this.model = NOOP;

    }

    this.defaultData = [];

    for (let i = 0, item; i < sourceArray.length; i++) {
      item = sourceArray[i];
      if (item?.$$) {
        item.$$.parentInternals = this;
        this.defaultData.push(deepClone(item.$$.getDefaultData()));
      } else {
        this.defaultData.push(deepClone(item));
      }
    }

    this.wildcardEvents = [];
    this.events = new Map([['*', this.wildcardEvents]]);
    this.structuralObserver = NOOP;

    this.parentInternals = null;
    this.ownPropertyName = '';

  }

  getDatum(index, writableOnly) {

    const item = this.nativeData[index];

    if (writableOnly && item?.$$) {
      return item.$$.getData(writableOnly);
    } else {
      return item;
    }

  }

  getData(writableOnly) {

    const copy = [];

    for (let i = 0, item; i < this.nativeData.length; i++) {
      item = this.nativeData[i];
      if (writableOnly && item?.$$) {
        copy.push(item.$$.getData(writableOnly));
      } else {
        copy.push(item);
      }
    }

    return copy;

  }

  getDefaultDatum(index) {
    return this.defaultData[index];
  }

  getDefaultData() {
    return this.defaultData;
  }

  setData(array, silent) {

    let didChange = array.length !== this.nativeData.length;

    this.nativeData.length = array.length;

    for (let i = 0, value, current; i < array.length; i++) {

      value = array[i];
      current = this.nativeData[i];

      if (current !== value) {

        if (current?.$$ && value && typeof value === 'object' && !value.$$) {

          current.$$.setData(value, silent); // patch object

        } else { // replace

          if (!value || value.$$ || typeof value !== 'object') {
            this.nativeData[i] = value;
          } else {
            this.nativeData[i] = this.model(value);
          }

          didChange = true;

        }

      }

    }

    if (didChange && !silent) {
      this.didMutate();
    }

  }

  setDatum(index, value, silent) {

    const current = this.nativeData[index];

    if (current !== value) {

      if (current?.$$ && value && typeof value === 'object' && !value.$$) {

        current.$$.setData(value, silent); // patch object

      } else { // replace

        if (!value || value.$$ || typeof value !== 'object') {
          this.nativeData[index] = value;
        } else {
          this.nativeData[index] = this.model(value);
        }

        if (!silent) {
          this.didMutate();
        }

      }

    }

  }

  internalize(items) {
    for (let i = 0, item; i < items.length; i++) {
      item = items[i];
      if (typeof item === 'object' && item && !item.$$) {
        items[i] = this.model(item);
      }
    }
    return items;
  }

  observe(wildcardKey, callback, unobservable, silent) {

    // ReactiveArrays have two types of observers:
    // (1) wildcard observers that fire on any array change, including public property
    // changes of nested objects.
    // (2) structural observers that only fire on structural array changes and never
    // on propagated child changes.

    this.events.get(wildcardKey).push(callback);

    if (!silent) {
      Queue.wildcardEvents.set(callback, this.owner);
      Queue.flush();
    }

    if (unobservable) {
      return () => this.wildcardEvents.splice(this.wildcardEvents.indexOf(callback), 1);
    }

  }

  setStructuralObserver(callback) {

    // a special wildcard that is only fired for structural changes
    // but never on propagation of child objects. only 1 per instance

    if (this.__structuralObserver) {

      // replace callback
      this.__structuralObserver = callback;

    } else {

      // assign callback
      this.__structuralObserver = callback;

      // register as prioritized wildcard
      this.wildcardEvents.unshift(value => {
        this.structuralObserver(value);
        this.structuralObserver = NOOP;
      });

    }

  }

  didMutate() {

    // The array buffer has been structurally modified.
    // Swap structural observer from noop to actual callback
    this.structuralObserver = this.__structuralObserver;

    // wildcards
    for (let i = 0; i < this.wildcardEvents.length; i++) {
      Queue.wildcardEvents.set(this.wildcardEvents[i], this.owner);
    }

    // parent
    if (this.parentInternals) {
      this.parentInternals.resolve(this.ownPropertyName, this.owner);
    }

    Queue.flush();

  }

  resolve() {

    // wildcards
    for (let i = 0; i < this.wildcardEvents.length; i++) {
      Queue.wildcardEvents.set(this.wildcardEvents[i], this.owner);
    }

    // parent
    if (this.parentInternals) {
      this.parentInternals.resolve(this.ownPropertyName, this.owner);
    }

    // resolve() will only be called via propagating child objects
    // so we are already flushing, do nothing else here

  }

}