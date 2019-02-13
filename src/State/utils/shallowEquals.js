
/**
 * One-level (shallow), ordered equality check.
 * Works for primitives, plain objects and arrays.
 * Other object types are not supported.
 * @function areShallowEqual
 * @param     {*}       a - Compare this to:
 * @param     {*}       b - this...
 * @returns   {boolean}   - True or false, depending on the evaluated shallow equality.
 * */
function areShallowEqual(a, b) {

  if (isArray(a)) return !isArray(b) || a.length !== b.length ? false : areArraysShallowEqual(a, b);

  if (typeof a === 'object') return typeof b !== 'object' || (a === null || b === null) && a !== b ? false : arePlainObjectsShallowEqual(a, b);

  return a === b;

}

/**
 * One-level (shallow), ordered equality check for arrays.
 * Specifically optimized for "areShallowEqual" which pre-compares array length!
 * @function areArraysShallowEqual
 * @param   {Array}  a - The array that is compared to:
 * @param   {Array}  b - this other array.
 * @returns {boolean}  - True if a and b are shallow equal, else false.
 * */
function areArraysShallowEqual(a, b) {

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;

}

/**
 * One-level (shallow), ordered equality check for plain old javascript objects.
 * @function arePlainObjectsShallowEqual
 * @param   {Object}  a - The object that is compared to:
 * @param   {Object}  b - this other object.
 * @returns {boolean}   - True if a and b are shallow equal, else false.
 * */
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