
Cue.Plugin('cue-equality', Library => {

  const Obj = Object;
  const isArray = Array.isArray;

  return Obj.assign(Library.core, {

    isEqual(a, b, deep = false) {

      if (a === b) return true;

      if (a && b && typeof a === 'object' && typeof b === 'object') {

        // Plain Objects (ordered) [fast-path]
        const objA = a.constructor === Obj;
        const objB = b.constructor === Obj;
        if (objA !== objB) return false;
        if (objA && objB) return this.arePlainObjectsEqual(a, b, deep);

        // Arrays (ordered)
        const arrayA = isArray(a);
        const arrayB = isArray(b);
        if (arrayA !== arrayB) return false;
        if (arrayA && arrayB) return this.areArraysEqual(a, b, deep);

        // Maps (ordered)
        const mapA = a instanceof Map;
        const mapB = b instanceof Map;
        if (mapA !== mapB) return false;
        if (mapA && mapB) return this.areMapsEqual(a, b, deep);

        // Sets (ordered)
        const setA = a instanceof Set;
        const setB = b instanceof Set;
        if (setA !== setB) return false;
        if (setA && setB) return this.areSetsEqual(a, b, deep);

        // Dates
        const dateA = a instanceof Date;
        const dateB = b instanceof Date;
        if (dateA !== dateB) return false;
        if (dateA && dateB) return a.getTime() === b.getTime();

        // Regexp
        const regexpA = a instanceof RegExp;
        const regexpB = b instanceof RegExp;
        if (regexpA !== regexpB) return false;
        if (regexpA && regexpB) return a.toString() === b.toString();

        // Other Objects [deferred]
        return this.arePlainObjectsEqual(a, b, deep);

      }

      // Primitives strictly compared
      return a !== a && b !== b;

    },

    areArraysEqual(a, b, deep = false) {

      if (a.length !== b.length) return false;

      for (let i = 0; i < a.length; i++) {
        if (!this.isEqual(a[i], b[i], deep)) {
          return false;
        }
      }

      return true;

    },

    arePlainObjectsEqual(a, b, deep = false) {

      const keysA = oKeys(a);
      const keysB = oKeys(b);

      if (keysA.length !== keysB.length) return false;

      for (let i = 0, k; i < keysA.length; i++) {
        k = keysA[i];
        if (keysB.indexOf(k) === -1 || !this.isEqual(a[k], b[keysB[i]], deep)) {
          return false;
        }
      }

      return true;

    },

    areMapsEqual(a, b, deep = false) {

      if (a.size !== b.size) return false;

      const arrA = Array.from(a);
      const arrB = Array.from(b);

      for (let i = 0, iA, iB; i < arrA.length; i++) {
        iA = arrA[i]; iB = arrB[i];
        if (iA[0] !== iB[0] || !this.isEqual(iA[1], iB[1], deep)) {
          return false;
        }
      }

      return true;

    },

    areSetsEqual(a, b, deep = false) {

      if (a.size !== b.size) return false;

      const arrA = Array.from(a);
      const arrB = Array.from(b);

      for (let i = 0; i < arrA.length; i++) {
        if (!this.isEqual(arrA[i], arrB[i], deep)) {
          return false;
        }
      }

      return true;

    }

  });

}, true);