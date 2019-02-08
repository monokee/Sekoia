
/**
 * Creates a new Array Type with a custom prototype object.
 * The array returned from this function is a standard JS Array that works exactly how you would expect an array to work.
 * @param [array] - The base (untyped) array that will be extended with a custom prototype object.
 * @param [proto] - The Prototype object that will be added to the returned array. Any properties and methods of proto will be available to the array via "this".
 * @returns       - A new Custom Array with a unique prototype. Array.isArray(cpa) === true / cpa instanceof Array === true
 */
function createArrayWithCustomPrototype(array = [], proto = {}) {

  function CPA(array) {
    return _construct(Array, array, new.target);
  }

  CPA.prototype = oCreate(Array.prototype, oGetOwnPropertyDescriptors(proto));
  oSetPrototypeOf(CPA, Array);

  return new CPA(array);

}

/**
 * Creates a new Plain Object Type with a custom prototype object and used as a convenience wrapper around Object.create.
 * @param [object]  - The base object that will be extended with a custom prototype object.
 * @param [proto]   - The Prototype object that will be added to the returned object. Any properties and methods of proto will be available on the base object via "this".
 * @returns         - A new Custom Pojo with a unique prototype. obj instanceof Object === true
 */
function createObjectWithCustomPrototype(object = {}, proto = {}) {
  return oCreate(proto, oGetOwnPropertyDescriptors(object));
}