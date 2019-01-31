
/**
 * Creates deep clone of serializable plain object.
 * Object must only contain primitives, plain objects or arrays.
 * @function deepClonePlainObject
 * @param   {Object} o      - The plain object to clone.
 * @returns {Object} clone  - Deeply cloned plain object.
 */
function deepClonePlainObject(o) {

  const clone = {};

  let i, v;

  for (i in o) {
    v = o[i];
    clone[i] = isArray(v) ? deepCloneArray(v) : isObjectLike(v) ? deepClonePlainObject(v) : v;
  }

  return clone;

}

/**
 * Creates deep clone of serializable Array.
 * Array must only contain primitives, plain objects or arrays.
 * @function deepCloneArray
 * @param   {Array} a      - The plain array to clone.
 * @returns {Array} clone  - Deeply cloned array.
 */
function deepCloneArray(a) {

  const clone = [];

  for (let i = 0, v; i < a.length; i++) {
    v = a[i];
    clone[i] = isArray(v) ? deepCloneArray(v) : isObjectLike(v) ? deepClonePlainObject(v) : v;
  }

  return clone;

}