
function setEndOfPropagationInBranchOf(derivative, direction) {
  // traverses derivatives to flag the deepest observed derivative in a computation branch.
  // this allows us to stop propagation of computations at the deepest occurring observer
  // and never recompute derivatives that are either unobserved or are an ancestor dependency of an
  // eventually unobserved child derivative.
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