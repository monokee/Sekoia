import { deepClone } from "../../utils/deep-clone.js";

export class ReactiveWrapper {

  constructor(internal) {
    Object.defineProperty(this, '_internal_', {
      value: internal
    });
  }

  get(key) {
    if (key === void 0) {
      return this._internal_.getData(false);
    } else {
      return this._internal_.getDatum(key, false);
    }
  }

  default(key) {
    // return deep clone of writable default values
    if (key === void 0) {
      return deepClone(this._internal_.getDefaultData());
    } else {
      return deepClone(this._internal_.getDefaultDatum(key));
    }
  }

  snapshot(key) {

    // return a deep clone of writable data
    if (key === void 0) {

      // getData(true) already returns a shallow copy...
      const copy = this._internal_.getData(true);

      // ...make it deep
      if (Array.isArray(copy)) {
        for (let i = 0; i < copy.length; i++) {
          copy[i] = deepClone(copy[i]);
        }
      } else {
        for (const key in copy) {
          if (copy.hasOwnProperty(key)) {
            copy[key] = deepClone(copy[key]);
          }
        }
      }

      return copy;

    } else {

      return deepClone(this._internal_.getDatum(key, true));

    }

  }

  set(key, value) {
    if (typeof key === 'object') {
      this._internal_.setData(key);
    } else {
      this._internal_.setDatum(key, value);
    }
  }

  reset(key) {
    if (key === void 0) {
      this.set(this.default());
    } else {
      this.set(key, this.default(key));
    }
  }

}