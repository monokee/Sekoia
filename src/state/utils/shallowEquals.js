
function areShallowEqual(a, b) {

  // One-level shallow, ordered equality check

  // Plain Objects
  if (a.constructor === Object && b.constructor === Object) {
    return arePlainObjectsShallowEqual(a, b);
  }

  // Plain Arrays
  if (isArray(a) && isArray(b)) {
    return areArraysShallowEqual(a, b);
  }

  // Primitives, Maps, Sets, Data, RegExp etc strictly compared
  return a === b;

}

function arePlainObjectsShallowEqual(a, b) {

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