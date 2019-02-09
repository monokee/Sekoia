
/**
 * Creates deep clone of serializable plain object.
 * Object must only contain primitives, plain objects or arrays.
 * @function deepClonePlainObject
 * @param   {Object} o      - The plain object to clone.
 * @returns {Object} clone  - Deeply cloned plain object.
 */
function deepClonePlainObject(o) {

  const clone = {};
  const keys = oKeys(o);

  for (let i = 0, prop, val; i < keys.length; i++) {
    prop = keys[i];
    val = o[prop];
    clone[prop] = !val ? val : isArray(val) ? deepCloneArray(val) : typeof val === 'object' ? deepClonePlainObject(val) : val;
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

  for (let i = 0, val; i < a.length; i++) {
    val = a[i];
    clone[i] = !val ? val : isArray(val) ? deepCloneArray(val) : typeof val === 'object' ? deepClonePlainObject(val) : val;
  }

  return clone;

}