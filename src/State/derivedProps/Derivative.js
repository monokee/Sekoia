
// Derived Property Instance
class Derivative {

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

  get value() {

    // Dynamic getter of value which recomputes only when
    // a direct (shallow) dependency has been previously updated

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

  updateProperty(property, value) {
    // update a single dependency of the derivative.
    // the passed value is guaranteed to have changed
    this.valueCache[property] = value;
    // because a dependency has been updated, we need to recompute
    // this.value the next time it is requested.
    this.needsUpdate = true;
  }

  fillCache(source) {
    // pulls in all dependency values from source object
    for (let i = 0, k; i < this.sourceProperties.length; i++) {
      k = this.sourceProperties[i];
      this.valueCache[k] = source[k];
    }
    this.needsUpdate = true;
  }

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