export const NOOP = (() => {});

export function deepEqual(a, b) {

  if (a === b) {
    return true;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {

    if (a.constructor !== b.constructor) return false;

    let i;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (i = a.length; i-- !== 0;) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keys = Object.keys(a);
    const length = keys.length;

    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0;) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    }

    for (i = length; i-- !== 0;) {
      const key = keys[i];
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;

  }

  return a !== a && b !== b;

}

export function deepClone(x) {

  if (!x || typeof x !== 'object') {
    return x;
  }

  if (Array.isArray(x)) {
    const y = [];
    for (let i = 0; i < x.length; i++) {
      y.push(deepClone(x[i]));
    }
    return y;
  }

  const keys = Object.keys(x);
  const y = {};
  for (let i = 0, k; i < keys.length; i++) {
    k = keys[i];
    y[k] = deepClone(x[k]);
  }

  return y;

}

export function areArraysShallowEqual(a, b) {

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

export function hashString(str) {
  if (!str.length) return '0';
  let hash = 0;
  for (let i = 0, char; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash + '';
}

export function getArrayIntersection(a, b) {

  const intersection = [];

  for (let x = 0; x < a.length; x++) {
    for (let y = 0; y < b.length; y++) {
      if (a[x] === b[y]) {
        intersection.push(a[x]);
        break;
      }
    }
  }

  return intersection;

}

export function getArrayTail(a, b) {

  const tail = [];

  for (let i = a.length; i < b.length; i++) {
    tail.push(b[i]);
  }

  return tail;

}

// ------------------------------------

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