
/**
 * Queues the subDerivatives of derivatives which have accumulated during a batch operation.
 * This method is called after a batch operation has finished and is an optimization that prevents unnecessary re-computations
 * of the dependency branch when there is a chance that one or many source properties are changed multiple times during a batch op (like actions).
 * @function cueAccumulated
 * @external {Array} accumulatedDerivatives - Contains unique derivatives which were affected by source property mutation(s). Their subDerivatives have not yet been queued.
 */
function cueAccumulated() {

  for (let i = 0, derivative, previous, result; i < accumulatedDerivatives.length; i++) {
    derivative = accumulatedDerivatives[i];
    previous = derivative._value; // internal
    result = derivative.value; // calls "getter" -> recomputes value
    if (derivative.hasChanged) {
      cueAll(derivative.ownPropertyName, result, previous, derivative.observers, derivative.subDerivatives, derivative.stopPropagation);
    }
  }

  // Empty accumulatedDerivatives
  accumulatedDerivatives.splice(0, accumulatedDerivatives.length);

}