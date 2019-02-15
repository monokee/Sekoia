
function areDeepEqual(a, b) {

  if (isArray(a)) return !isArray(b) || a.length !== b.length ? false : areArraysDeepEqual(a, b);

  if (typeof a === 'object') return typeof b !== 'object' || (a === null || b === null) && a !== b ? false : arePlainObjectsDeepEqual(a, b);

  return a === b;

}

function areArraysDeepEqual(a, b) {

  for (let i = 0; i < a.length; i++) {
    if (!areDeepEqual(a[i], b[i])) {
      return false;
    }
  }

  return true;

}

function arePlainObjectsDeepEqual(a, b) {

  const keysA = oKeys(a);
  const keysB = oKeys(b);

  if (keysA.length !== keysB.length) return false;

  for (let i = 0, k; i < keysA.length; i++) {
    k = keysA[i];
    if (keysB.indexOf(k) === -1 || !areDeepEqual(a[k], b[keysB[i]])) {
      return false;
    }
  }

  return true;

}