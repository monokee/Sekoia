export function deepEqual(a, b) {

  if (a === b) {
    return true;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {

    if (a.constructor !== b.constructor) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = a.length; i-- !== 0;) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keys = Object.keys(a);
    const length = keys.length;

    if (length !== Object.keys(b).length) return false;

    for (let i = length; i-- !== 0;) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    }

    for (let i = length, key; i-- !== 0;) {
      key = keys[i];
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;

  }

  return a !== a && b !== b;

}