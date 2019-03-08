
let REACTION_BUFFER = null;
let FLUSHING_BUFFER = false;

/**
 * Runs through the Main Queue to execute each collected reaction with each collected property value as the first and only argument.
 * Calls to react() are automatically buffered and internal flush() is only called on the next available frame after the last call to react().
 * This accumulates reactions during batch operations with many successive calls to react() and flushes them in one go when the call
 * rate is decreased. Because reactions likely trigger rendering, this attempts to defer and separate rendering from internal value updating and change propagation.
 * Main Queue is emptied after each call to react.
 * Since react is the last function called after a property has changed (with each change increasing the accumulation depth), we decrease the depth by one for
 * each call to react and empty the accumulation arrays when accumulationDepth === 0 ie: we've "stepped out of" the initial change and all of it's derived changes throughout the state tree.
 * Note that this is done synchronously and outside of buffering.
 */
function react() {

  if (REACTION_BUFFER === null && FLUSHING_BUFFER === false) {
    REACTION_BUFFER = requestAnimationFrame(flushReactionBuffer);
  }

}

function flushReactionBuffer() {

  FLUSHING_BUFFER = true;

  let tuple, derivative, scope, result;
  const resolved = [];

  // DERIVATIVES ------------>

  while (DERIVATIVE_QUEUE.size > 0) {

    for (tuple of DERIVATIVE_QUEUE.entries()) {

      derivative = tuple[0];
      scope = tuple[1];

      if (resolved.indexOf(derivative) === -1) {

        derivative.needsUpdate = true;
        result = derivative.value();
        resolved.push(derivative);

        if (derivative.hasChanged === true) {
          scope.cueObservers.call(scope, derivative.ownPropertyName, result);
          SUB_DERIVATIVE_QUEUE.set(derivative, scope);
        }

      }

    }

    DERIVATIVE_QUEUE.clear();

    for (tuple of SUB_DERIVATIVE_QUEUE.entries()) {

      derivative = tuple[0];
      scope = tuple[1];

      if (scope.derivativesOf.has(derivative.ownPropertyName)) {

        const subDerivatives = scope.derivativesOf.get(derivative.ownPropertyName);

        for (let i = 0; i < subDerivatives.length; i++) {
          DERIVATIVE_QUEUE.set(subDerivatives[i], scope);
        }

      }

    }

    SUB_DERIVATIVE_QUEUE.clear();

  }

  // REACTIONS ----------->

  for (tuple of REACTION_QUEUE.entries()) {
    tuple[0](tuple[1]);
  }

  REACTION_BUFFER = null;
  FLUSHING_BUFFER = false;
  REACTION_QUEUE.clear();

}