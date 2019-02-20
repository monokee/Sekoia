
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

    this.source = undefined; // the source object the computations pull its values from

    this.intermediate = undefined; // intermediate computation result
    this._value = undefined; // current computation result
    this._cachedValue = undefined; // deep structural copy of current computation result for value comparison

    this.needsUpdate = true; // flag indicating that one or many dependencies have been updated (required by this.value getter) DEFAULT TRUE
    this.stopPropagation = false; // flag for the last observed derivative in a dependency branch (optimization)
    this.hasChanged = false; // flag indicating that the computation has yielded a new result (required for dependency traversal)

  }

  get value() {

    if (this.needsUpdate) {

      this.intermediate = this.computation.call(null, this.source);

      if (areShallowEqual(this._value, this.intermediate)) { // shallow compare objects

        this.hasChanged = false;

      } else {

        this._value = isArray(this.intermediate) // shallow clone objects in cache
          ? this.intermediate.slice()
          : typeof this.intermediate === 'object' && this.intermediate !== null
            ? oAssign({}, this.intermediate)
            : this.intermediate;

        this.hasChanged = true;

      }

      this.needsUpdate = false;

    }

    return this._value;

  }

  dispose(root = true) {

    let i;

    // clear anything that could potentially hold on to strong pointers
    this.source = undefined;
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