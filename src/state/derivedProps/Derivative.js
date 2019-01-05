
// Derived Property
class Derivative {

  constructor(parent, ownPropertyName, computation) {

    this[_IS_DERIVATIVE_] = true; // id

    this.parent = parent; // the source of the data for the computation
    this.ownPropertyName = ownPropertyName;
    this.computation = computation; // the function that computes a result from data points on the source

    this.dependencies = []; // property names this derivative depends on
    this.derivatives = []; // other derivatives that depend on this derivative. Allows for downwards traversal.
    this.superDerivatives = []; // if derivative is derived from other derivative(s), set superDerivative(s). Allows for upwards traversal.

    this.dependencyValues = Object.create(null); // property-value cache

    this.observers = []; // collection of observers observing this property
    this.stopPropagation = false; // flag for the last observed derivative in a dependency branch (optimization)

    this.intermediate = undefined; // intermediate computation result
    this._value = undefined; // current computation result

    this.readyToInstall = false; // flag indicating that all dependencies are resolved so we can compute initial value (required only at installation time)
    this.needsUpdate = false; // flag indicating that one or many dependencies have been updated (required by this.value getter)
    this.hasChanged = false; // flag indicating that the computation has yielded a new result (required for dependency traversal)

  }

  get value() {

    // Dynamic getter of value which recomputes only when
    // a direct (shallow) dependency has been previously updated

    if (this.needsUpdate) {

      // recompute
      this.intermediate = this.computation.call(null, this.dependencyValues);

      // compare to previous value (shallow compare objects)
      if (this._value && typeof this._value === 'object' && this.intermediate && typeof this.intermediate === 'object') {

        if (isShallowEqual(this._value, this.intermediate)) {
          this.hasChanged = false;
        } else {
          this._value = this.intermediate;
          this.hasChanged = true;
        }

      } else if (this.intermediate !== this._value) {

        this._value = this.intermediate;
        this.hasChanged = true;

      } else {

        this.hasChanged = false;

      }

      // computation is up to date (until it gets invalidated by changing a dependency again...)
      this.needsUpdate = false;

    }

    return this._value;

  }

  updateProperty(property, value) {
    // update a single dependency of the derivative.
    // the passed value is guaranteed to have changed
    this.dependencyValues[property] = value;
    // because a dependency has been updated, we need to recompute
    // this.value the next time it is requested.
    this.needsUpdate = true;
  }

  connect() {
    // running the computation will trigger "get" handlers on the parent model for any properties that the computation depends on
    // the "get" handler checks if there is a derivative to install, and if so, it adds the derivative as a dependency of the triggered property
    // and it adds all triggered properties to this derivatives' source properties.
    derivativeToConnect = this;

    try {
      // at installation time, the computation will likely request dependencies that are still undefined.
      // this would throw in many cases but since we don't care at this point about the actual value but only the property names the derivative depends on, we can safely ignore the error.
      // this.parent is both "this" context and first argument because:
      // As a convention, derivatives should destructure dependencies from first argument instead of using "this" to ensure all dependencies are reached even if computation body contains conditionals.
      this.computation.call(this.parent, this.parent);

    } catch (e) {}

    derivativeToConnect = null;

  }

  refreshCache(source) {
    // pulls in all dependency values
    for (let i = 0, k; i < this.dependencies.length; i++) {
      k = this.dependencies[i];
      this.dependencyValues[k] = source[k];
    }
    this.needsUpdate = true;
  }

  dispose(root = true) {

    let i;

    this.parent[_DERIVED_PROPERTIES_].delete(this.ownPropertyName);

    this.parent[_DERIVATIVES_OF_].forEach((prop, derivatives) => {
      i = derivatives.indexOf(this);
      if (i > -1) derivatives.splice(i, 1);
    });

    // clear anything that could potentially hold on to strong pointers
    this.dependencyValues = undefined;
    this.observers = undefined;
    this.intermediate = undefined;
    this._value = undefined;

    // remove self from any superDerivatives
    for (i = 0; i < this.superDerivatives.length; i++) {
      this.superDerivatives[i].derivatives = this.superDerivatives[i].derivatives.filter(d => d !== this);
      // reset end of observation
      flagClosestObservedSuperDerivativesOf(this.superDerivatives[i], true);
    }

    // dispose all sub-derivatives
    for (i = 0; i < this.derivatives.length; i++) {
      this.derivatives[i].dispose(false); // false -> downwards recursion form root of removal
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