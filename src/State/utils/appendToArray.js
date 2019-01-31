
/**
 * Utility to functionally append the contents of one array to another array
 * @function appendToArray
 * @param   {Array} target    - The array to which we append.
 * @param   {Array} toAppend  - Append its items to the target.
 * @returns {Array} target    - The merged array.
 */
function appendToArray(target, toAppend) {

  for (let i = 0; i < toAppend.length; i++) {
    target.push(toAppend[i]);
  }

  return target;

}