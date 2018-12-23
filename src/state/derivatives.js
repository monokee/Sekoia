
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
      // this would throw in many cases but since we don't care at this point about the actual value but only the property the derivative depends on, we can safely ignore the error.
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

// Derivative Handling
function setupDerivatives(data, model, derivedProperties) {

  const props = Object.keys(data);
  const total = props.length;

  let i, k, prop;

  // 1: Create Derivatives + Modify Data
  for (i = 0; i < props.length; i++) {
    // for each (own) function in the data object
    prop = props[i];
    if (data.hasOwnProperty(prop) && typeof data[prop] === 'function') {
      addDerivative(data, model, prop, derivedProperties);
    }
  }

  if (derivedProperties.size === 0) {
    return false;
  }

  // 2: Connect Derivatives.
  // handshake method that sets up the derivative as a derivative of it's
  // model sources and the sources as dependencies on the derivative.
  derivedProperties.forEach(derivative => derivative.connect());

  // Next we have to traverse the model and fill the cache of each derivative.
  // Because derivatives can depend on other derivatives, we need this
  // basic tree traversal algorithm that only computes a derived property
  // when all of it's dependencies are marked ready.

  let sourceProp, derivative, sourceDerivative;
  const ready = [];

  // 3: Traverse
  search : while (ready.length < total) { // search entire stack until all derivatives are ready

    for (i = 0; i < total; i++) { // for each property

      prop = props[i];
      derivative = derivedProperties.get(prop);

      if (derivative && derivative.readyToInstall === false) { // if property is a pending derivative

        for (k = 0; k < derivative.dependencies.length; k++) { // for each of its source dependencies

          sourceProp = derivative.dependencies[k];
          sourceDerivative = derivedProperties.get(sourceProp);

          if (sourceDerivative && sourceDerivative.readyToInstall === false) {
            derivative.readyToInstall = false;
            break;
          } else {
            derivative.readyToInstall = true;
          }

        }

        if (derivative.readyToInstall) {

          // all dependencies of the derivative are now available.
          // copy source data values into the derivatives' internal cache:
          derivative.refreshCache(data);
          ready.push(prop);

        }

      } else if (ready.indexOf(prop) === -1) {

        ready.push(prop);

      }

      if (ready.length === total) {
        break search;
      }

    }

  }

  return true;

}

function addDerivative(data, model, property, derivedProperties) {

  const derivative = new Derivative(model, property, data[property]);

  derivedProperties.set(property, derivative);

  // replace the function on the data object with a getter that returns the value of the derivative
  // derivative.value is also a "getter" that automatically recomputes the value only if any of its' dependencies have changed.
  Object.defineProperty(data, property, {
    get() { return derivative.value },
    configurable: true,
    enumerable: false
  });

  return derivative;

}

function setEndOfPropagationInBranchOf(derivative, direction) {
  // traverses derivatives to flag the deepest observed derivative in a computation branch.
  // this allows us to stop propagation of computations at the deepest occurring observer
  // and never recompute derivatives that are either unobserved or are a precursor dependency of an
  // eventually unobserved derivative.
  if (direction === TRAVERSE_DOWN) {
    unflagAllSuperDerivativesOf(derivative); // unflag anything upwards of derivative
    flagDeepestObservedSubDerivativesOf(derivative); // flag deepest observed sub-derivative (can be self)
  } else if (direction === TRAVERSE_UP) {
    flagClosestObservedSuperDerivativesOf(derivative); // find closest observed superDerivatives (if any)
  }
}

function unflagAllSuperDerivativesOf(derivative) {
  if (derivative.superDerivatives.length) {
    for (let i = 0, superDerivative; i < derivative.superDerivatives.length; i++) {
      superDerivative = derivative.superDerivatives[i];
      superDerivative.stopPropagation = false;
      if (superDerivative.superDerivatives.length) {
        unflagAllSuperDerivativesOf(superDerivative);
      }
    }
  }
}

function flagDeepestObservedSubDerivativesOf(derivative, inclusive = true) {
  derivative.stopPropagation = inclusive; // can be self
  if (derivative.derivatives.length) {
    for (let i = 0, subDerivative; i < derivative.derivatives.length; i++) {
      subDerivative = derivative.derivatives[i];
      if (subDerivative.observers.length) {
        derivative.stopPropagation = false;
        flagDeepestObservedSubDerivativesOf(subDerivative);
      }
    }
  }
}

function flagClosestObservedSuperDerivativesOf(derivative, inclusive = false) {
  derivative.stopPropagation = inclusive; // self
  for (let i = 0, superDerivative; i < derivative.superDerivatives.length; i++) {
    superDerivative = derivative.superDerivatives[i];
    if (superDerivative.observers.length) {
      superDerivative.stopPropagation = true;
    } else {
      flagClosestObservedSuperDerivativesOf(superDerivative);
    }
  }
}