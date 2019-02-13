
/**
 * Called when state is mutated in a batch operation. Queues only the immediate reactions and derivatives of a mutated source property.
 * Explicitly collects the immediate derivatives of the mutated source properties on "accumulatedDerivatives" Array
 * so that the queueing of their subDerivatives (their dependency branch) can be deferred until the batch operation has finished.
 * Batch Op is detected -> Mutations call cueImmediate -> batch op finishes -> cueAccumulated is called -> react() is called.
 * @function cueImmediate
 * @external {Array} accumulatedDerivatives - Collects unique derivatives which were affected by source property mutation(s). Queueing of their subDerivatives is deferred.
 */
function cueImmediate(prop, value, path, observers, derivatives, stopPropagation) {

  let i, reaction, derivative;

  if (observers) {

    for (i = 0; i < observers.length; i++) {
      reaction = observers[i];
      if (MAIN_QUEUE.indexOf(reaction) === -1) {
        MAIN_QUEUE.push(reaction, value, path);
      }
    }

  }

  if (derivatives && stopPropagation === false) {
    for (i = 0; i < derivatives.length; i++) {
      derivative = derivatives[i];
      derivative.updateProperty(prop, value);
      if (accumulatedDerivatives.indexOf(derivative) === -1) {
        accumulatedDerivatives.push(derivative);
      }
    }
  }

}