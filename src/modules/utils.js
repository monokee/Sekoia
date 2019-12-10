export const NOOP = (() => {});

export function deepEqual(a, b) {

  if (Array.isArray(a)) {
    return !Array.isArray(b) || a.length !== b.length ? false : areArraysDeepEqual(a, b);
  }

  if (typeof a === 'object') {
    return typeof b !== 'object' || (a === null || b === null) && a !== b ? false : arePlainObjectsDeepEqual(a, b);
  }

  return a === b;

}

export function deepClone(x) {
  return Array.isArray(x) ? deepCloneArray(x) : deepClonePlainObject(x);
}

export function areArraysShallowEqual(a, b) {
  // pre-compare array length outside of this function!
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;

}

export function arePlainObjectsShallowEqual(a, b) {

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

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

export function ifFn(x) {
  return typeof x === 'function' ? x : NOOP;
}

// ------------------------------------

function arePlainObjectsDeepEqual(a, b) {

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0, k; i < keysA.length; i++) {
    k = keysA[i];
    if (keysB.indexOf(k) === -1 || !deepEqual(a[k], b[keysB[i]])) {
      return false;
    }
  }

  return true;

}

function areArraysDeepEqual(a, b) {

  for (let i = 0; i < a.length; i++) {
    if (!deepEqual(a[i], b[i])) {
      return false;
    }
  }

  return true;

}

function deepClonePlainObject(o) {

  const clone = {};
  const keys = Object.keys(o);

  for (let i = 0, prop, val; i < keys.length; i++) {
    prop = keys[i];
    val = o[prop];
    clone[prop] = !val ? val : Array.isArray(val) ? deepCloneArray(val) : typeof val === 'object' ? deepClonePlainObject(val) : val;
  }

  return clone;

}

function deepCloneArray(a) {

  const clone = [];

  for (let i = 0, val; i < a.length; i++) {
    val = a[i];
    clone[i] = !val ? val : Array.isArray(val) ? deepCloneArray(val) : typeof val === 'object' ? deepClonePlainObject(val) : val;
  }

  return clone;

}