
function cueImmediate(prop, value, oldValue, observers, derivatives, stopPropagation) {

  // Collect immediate observers and derivatives of the changed property. Don't recurse over sub-derivatives just yet.

  let i, item;

  if (observers) {
    for (i = 0; i < observers.length; i++) {
      item = observers[i];
      if (MAIN_QUEUE.indexOf(item) === -1) {
        MAIN_QUEUE.push(item, {
          value: value,
          oldValue: oldValue
        });
      }
    }
  }

  if (derivatives && stopPropagation === false) {
    for (i = 0; i < derivatives.length; i++) {
      derivatives[i].updateProperty(prop, value);
    }
  }

}