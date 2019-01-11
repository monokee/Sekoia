
oAssign(CUE_PROTO, {

  deepClone(o) {

    // Deep cloning for plain Arrays and Objects

    if (isArray(o)) {

      const clone = [];

      for (let i = 0, v; i < o.length; i++) {
        v = o[i];
        clone[i] = typeof v === 'object' ? this.deepClone(v) : v;
      }

      return clone;

    }

    if (o.constructor === Object) {

      const clone = {};

      let i, v;

      for (i in o) {
        v = o[i];
        clone[i] = typeof v === 'object' ? this.deepClone(v) : v;
      }

      return clone;

    }

  },

  shallowClone(o) {

    // Shallow cloning for plain Arrays and Objects

    if (isArray(o)) {
      return o.slice();
    }

    if (o.constructor === Object) {
      return oAssign({}, o);
    }

  },

  deepCompare(a, b) {

    // deeply compares primitives, plain arrays && plain objects by content value
    // does not work for functions and object types other than plain old objects and arrays!

    if (a === b) { // primitive value or pointer is equal

      return true;

    } else {

      const typeA = typeof a;

      if (typeA === typeof b) { // same type (can be object and array!)

        const bIsArray = isArray(b);

        if (isArray(a) && bIsArray) { // array::array

          if (a.length !== b.length) { // length mismatch
            return false;
          } else {
            for (let i = 0; i < a.length; i++) {
              if (!this.deepCompare(a[i], b[i])) return false;
            }
            return true;
          }

        } else if (typeA === 'object' && !bIsArray) { // object::object

          let k;
          for (k in a) {
            if (!this.deepCompare(a[k], b[k])) return false;
          }
          return true;

        } else { // object::array || array::object

          return false;

        }

      } else { // type mismatch

        return false;

      }

    }

  },

  shallowCompare(a, b) {

    // One-level shallow, ordered equality check

    // Plain Objects
    if (a.constructor === Object && b.constructor === Object) {

      const keysA = oKeys(a);
      const keysB = oKeys(b);

      if (keysA.length !== keysB.length) {
        return false;
      }

      for (let i = 0, k; i < keysA.length; i++) {
        k = keysA[i];
        if (keysB.indexOf(k) === -1 || a[k] !== b[k]) {
          return false;
        }
      }

      return true;

    }

    // Plain Arrays
    if (isArray(a) && isArray(b)) {

      if (a.length !== b.length) {
        return false;
      }

      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }

      return true;

    }

    // Primitives, Maps, Sets, Data, RegExp and other Objects
    // limited to strict equality comparison
    return a === b;

  },

  mergeObjects(...objects) {

    // merge multiple objects into first object

    let i = 0, l = objects.length, key = '';

    while (++i < l) {
      for (key in objects[i]) {
        if (objects[i].hasOwnProperty(key)) {
          objects[0][key] = objects[i][key];
        }
      }
    }

    return objects[0];

  }

});