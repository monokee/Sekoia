
function areShallowEqual(a, b) {

  // One-level shallow, ordered equality check
  if (a === b) return true;

  if (a && b && typeof a === 'object' && typeof b === 'object') {

    // Plain Arrays
    const arrayA = isArray(a);
    const arrayB = isArray(b);

    if (arrayA !== arrayB) return false;
    if (arrayA && arrayB) return areArraysShallowEqual(a, b);

    // Plain Objects
    const objA = a.constructor === Object;
    const objB = b.constructor === Object;

    if (objA !== objB) return false;
    if (objA && objB) return arePlainObjectsShallowEqual(a, b);

  }

  // Primitives, Maps, Sets, Date, RegExp etc strictly compared
  return a !== a && b !== b;

}

function arePlainObjectsShallowEqual(a, b) {

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

function areArraysShallowEqual(a, b) {

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