
/**
 * Queues all reactions, derivatives and their subDerivative branch in a single recursive function.
 * This function is used for queueing dependencies whenever we are not in a batch-op situation (like actions) and we don't want to
 * defer dependency traversal until after a batch op has finished.
 * @function cueAll
 * @param {string}  prop            - The property which has been mutated.
 * @param {*}       value           - The result of the mutation.
 * @param {string}  path            - The path of the property relative to the nearest model-based instance.
 * @param {Array}   observers       - Reaction handlers observing the property.
 * @param {Array}   derivatives     - Derivatives that are being derived from the property.
 * @param {boolean} stopPropagation - Whether or not a derivative has been flagged to be the last observed derivative in its dependency branch. Used for recursion.
 */
function cueAll(prop, value, path, observers, derivatives, stopPropagation) {

  let i, l, item;

  if (observers) {

    const o_O = {value, path};

    // add pairs of unique [reactionHandler, observationObject] to queue
    for (i = 0; i < observers.length; i++) {
      item = observers[i];
      if (MAIN_QUEUE.indexOf(item) === -1) {
        MAIN_QUEUE.push(item, o_O);
      }
    }

  }

  if (derivatives && (l = derivatives.length) && stopPropagation === false) {

    // update internal cache of derivatives
    for (i = 0; i < l; i++) {
      derivatives[i].updateProperty(prop, value);
    }

    // recompute value and recurse
    let result;

    for (i = 0; i < l; i++) {

      item = derivatives[i];
      result = item.value; // calls "getter" -> recomputes _value

      if (item.hasChanged) { // has value changed after recomputation -> recurse
        cueAll(item.ownPropertyName, result, item.ownPropertyName, item.observers, item.subDerivatives, item.stopPropagation);
      }

    }

  }

}