
function cueAll(prop, value, oldValue, observers, derivatives, stopPropagation) {

  // Collect observers and derivatives of the changed property and, recursively those of all of it's descendant derivatives

  let i, l, item;

  if (observers) {
    for (i = 0; i < observers.length; i++) {
      item = observers[i];
      if (MAIN_QUEUE.indexOf(item) === -1) {
        MAIN_QUEUE.push(item, {
          property: prop,
          value: value,
          oldValue: oldValue
        });
      }
    }
  }

  if (derivatives && (l = derivatives.length) && stopPropagation === false) {

    // update internal cache of derivatives
    for (i = 0; i < l; i++) {
      derivatives[i].updateProperty(prop, value);
    }

    // recompute value and recurse
    let previous, result;

    for (i = 0; i < l; i++) {

      item = derivatives[i];
      previous = item._value; // uses internal _value
      result = item.value; // calls "getter" -> recomputes _value

      if (item.hasChanged) { // has value changed after recomputation -> recurse
        cueAll(item.ownPropertyName, result, previous, item.observers, item.subDerivatives, item.stopPropagation);
      }

    }

  }

}