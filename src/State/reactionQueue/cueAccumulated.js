
function cueAccumulated(derivatives) {

  for (let i = 0, item, previous, result; i < derivatives.length; i++) {
    item = derivatives[i];
    previous = item._value; // internal
    result = item.value; // calls "getter" -> recomputes value
    if (item.hasChanged) {
      cueAll(item.ownPropertyName, result, previous, item.observers, item.derivatives, item.stopPropagation);
    }
  }

}