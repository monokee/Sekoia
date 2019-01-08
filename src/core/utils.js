
// Cue Scoped Utils and Helpers (available anywhere in the library)

// NoOp method
const NOOP = ()=>{};

// All mutating array methods
const ARRAY_MUTATORS = new Set(['copyWithin','fill','pop','push','reverse','shift','sort','splice','unshift']);

// Static Object/Array Helpers
const assign = Object.assign;
const create = Object.create;
const defineProperty = Object.defineProperty;
const defineProperties = Object.defineProperties;
const objKeys = Object.keys;
const isArray = Array.isArray;

// Static Math Helpers
const MAX = Math.max;
const MIN = Math.min;
const RANDOM = Math.random;
const ABS = Math.abs;
const POW = Math.pow;
const ROUND = Math.round;
const FLOOR = Math.floor;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Reflect methods
const _set = Reflect.set;
const _get = Reflect.get;
const _apply = Reflect.apply;
const _delete = Reflect.deleteProperty;

// Helper methods
function isShallowEqual(a, b) {

  // One-level shallow, ordered equality check

  // Plain Objects
  if (a.constructor === Object && b.constructor === Object) {

    const keysA = objKeys(a);
    const keysB = objKeys(b);

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

  // for other types fall back to strict (pointer) equality
  return a === b;

}