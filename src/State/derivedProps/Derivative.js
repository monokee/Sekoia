
/**
 * Creates a new computed property instance.
 * @class Derivative
 */
class Derivative {

  /**
   * @constructs
   * @param {string}    ownPropertyName   - The name of the derived property on the parent node graph (state instance).
   * @param {function}  computation       - The pure computation function that should return its result.
   * @param {array}     sourceProperties  - Array of property keys that this derivative depends on.
   */
  constructor(ownPropertyName, computation, sourceProperties) {

    this.ownPropertyName = ownPropertyName;
    this.computation = computation; // the function that computes a result from data points on the source
    this.sourceProperties = sourceProperties; // property names this derivative depends on

    this.subDerivatives = []; // other derivatives that depend on this derivative. Allows for downwards traversal.
    this.superDerivatives = []; // if derivative is derived from other derivative(s), set superDerivative(s). Allows for upwards traversal.
    this.observers = [];

    this.valueCache = oCreate(null); // property-value cache

    this.intermediate = undefined; // intermediate computation result
    this._value = undefined; // current computation result

    this.stopPropagation = false; // flag for the last observed derivative in a dependency branch (optimization)
    this.needsUpdate = false; // flag indicating that one or many dependencies have been updated (required by this.value getter)
    this.hasChanged = false; // flag indicating that the computation has yielded a new result (required for dependency traversal)

  }

  /**
   * Dynamic getter of computation result which recomputes only when a direct (shallow) dependency has been previously updated
   * @return {*} The current value of the derivative
   */
  get value() {

    if (this.needsUpdate) {

      // recompute
      this.intermediate = this.computation.call(null, this.valueCache);

      // compare to previous value
      if (areShallowEqual(this._value, this.intermediate)) {
        this.hasChanged = false;
      } else {
        this._value = this.intermediate;
        this.hasChanged = true;
      }

      // computation is up to date (until it gets invalidated by changing a dependency again...)
      this.needsUpdate = false;

    }

    return this._value;

  }

  /**
   * Update a single sourceProperty of the derivative by updating the internal valueCache.
   * Flag needsUpdate to true so that the next request to value getter will recompute.
   * @param {string} property - The property that needs to update its value
   * @param {*}      value    - The new value. This value is guaranteed to have changed(!)
   */
  updateProperty(property, value) {
    // update a single dependency of the derivative.
    // the passed value is guaranteed to have changed
    this.valueCache[property] = value;
    // because a dependency has been updated, we need to recompute
    // this.value the next time it is requested.
    this.needsUpdate = true;
  }

  /**
   * Pull in all dependency values from source. Used at instantiation time to fill cache with initial values
   * @param {object} source - The source state object from which values should be pulled into the internal cache.
   */
  fillCache(source) {
    // pulls in all dependency values from source object
    for (let i = 0, k; i < this.sourceProperties.length; i++) {
      k = this.sourceProperties[i];
      this.valueCache[k] = source[k];
    }
    this.needsUpdate = true;
  }

  /**
   * Dispose this derivative by nullifying its strong pointers and removing itself from its computation branch.
   * @param {boolean} root - required for recursive calls to self. see inline comments below
   */
  dispose(root = true) {

    let i;

    // clear anything that could potentially hold on to strong pointers
    this.valueCache = undefined;
    this.observers = undefined;
    this.intermediate = undefined;
    this._value = undefined;

    // remove self from any superDerivatives
    for (i = 0; i < this.superDerivatives.length; i++) {
      this.superDerivatives[i].subDerivatives = this.superDerivatives[i].subDerivatives.filter(d => d !== this);
      // reset end of observation
      flagClosestObservedSuperDerivativesOf(this.superDerivatives[i], true);
    }

    // dispose all sub-derivatives
    for (i = 0; i < this.subDerivatives.length; i++) {
      this.subDerivatives[i].dispose(false); // false -> downwards recursion form root of removal
    }

    // if root of removal, reset end of propagation downwards from parent node branches.
    if (root) {
      for (i = 0; i < this.superDerivatives.length; i++) {
        setEndOfPropagationInBranchOf(this.superDerivatives[i], TRAVERSE_DOWN);
      }
    }

    this.superDerivatives = undefined;

  }

}