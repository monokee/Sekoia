
/**
 * One-level (shallow), ordered equality check.
 * Works for primitives, plain objects and arrays.
 * Other object types are strictly compared.
 * @function areShallowEqual
 * @param     {*}       a - Compare this to:
 * @param     {*}       b - this...
 * @returns   {boolean}   - True or false, depending on the evaluated shallow equality.
 * */
function areShallowEqual(a, b) {

  if (a === b) return true;

  if (a && b && typeof a === 'object' && typeof b === 'object') {

    // Plain Arrays
    const arrayA = isArray(a);
    const arrayB = isArray(b);

    if (arrayA !== arrayB) return false;
    if (arrayA && arrayB) return areArraysShallowEqual(a, b);

    // Plain Objects
    const objA = a.constructor === OBJ;
    const objB = b.constructor === OBJ;

    if (objA !== objB) return false;
    if (objA && objB) return arePlainObjectsShallowEqual(a, b);

  }

  // Maps, Sets, Date, RegExp etc strictly compared
  return a !== a && b !== b;

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

/**
 * One-level (shallow), ordered equality check for arrays.
 * @function areArraysShallowEqual
 * @param   {Array}  a - The array that is compared to:
 * @param   {Array}  b - this other array.
 * @returns {boolean}  - True if a and b are shallow equal, else false.
 * */
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