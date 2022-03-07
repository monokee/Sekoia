import { deepClone } from "../../utils/deep-clone.js";

export class ReactiveWrapper {

  constructor(internal) {
    Object.defineProperty(this, '$$', {
      value: internal
    });
  }

  get(key) {
    if (key === void 0) {
      return this.$$.getData(false);
    } else {
      return this.$$.getDatum(key, false);
    }
  }

  default(key) {
    // return deep clone of writable default values
    if (key === void 0) {
      return deepClone(this.$$.getDefaultData());
    } else {
      return deepClone(this.$$.getDefaultDatum(key));
    }
  }

  snapshot(key) {

    // return a deep clone of writable data
    if (key === void 0) {

      // getData(true) already returns a shallow copy...
      const copy = this.$$.getData(true);

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

      return deepClone(this.$$.getDatum(key, true));

    }

  }

  set(key, value) {
    if (typeof key === 'object') {
      this.$$.setData(key);
    } else {
      this.$$.setDatum(key, value);
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