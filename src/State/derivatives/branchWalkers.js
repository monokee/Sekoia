
/**
 * Traverses derivatives to flag the deepest observed derivative in a computation branch.
 * This allows me to to stop propagation of computations at the deepest occurring observer
 * and never recompute derivatives that are either unobserved or are an ancestor dependency of
 * an eventually unobserved child derivative.
 * @function setEndOfPropagationInBranchOf
 * @param {object} derivative - The Root Derivative from which we start walking.
 * @param {number} direction - The traversal direction indicating whether we should walk up or down.
 * */
function setEndOfPropagationInBranchOf(derivative, direction) {
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
  if (derivative.subDerivatives.length) {
    for (let i = 0, subDerivative; i < derivative.subDerivatives.length; i++) {
      subDerivative = derivative.subDerivatives[i];
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