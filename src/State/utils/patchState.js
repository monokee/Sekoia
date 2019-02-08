
/**
 * State reconciliation to "batch-patch" data collections into the current state tree.
 * Instead of replacing the entire tree, the algorithm attempts to mutate existing data points in the "parent[property]" object
 * to match the shape of the provided "value" object. This avoids unnecessary change-reactions throughout the system.
 * @param parent    - The parent object graph holding a property that contains the object to be patched.
 * @param property  - The target property name of the object to be patched on the parent node graph.
 * @param value     - The object dictating the future shape of parent[property].
 * @param [key]     - When provided, this key is used to determine object equality.
 */
function patchState(parent, property, value, key = 'id') {

  const previous = parent[property];

  if (value === previous) {
    return;
  }

  if (previous === null || previous === undefined || value === null || typeof value !== 'object') {
    if (value === undefined) {
      delete parent[property]
    } else {
      parent[property] = value;
    }
    return;
  }

  if (isArray(value)) {

    if (value.length && previous.length && (key && value[0][key] != null)) {

      let i, j, start, end, newEnd, item, newIndicesNext, keyVal, temp = new Array(value.length), newIndices = new Map();

      // skip common prefix and suffix
      for (start = 0, end = Math.min(previous.length, value.length); start < end && (previous[start] === value[start] || key && previous[start][key] === value[start][key]); start++) {
        patchState(previous, start, value[start], key);
      }

      for (end = previous.length - 1, newEnd = value.length - 1; end >= 0 && newEnd >= 0 && (previous[end] === value[newEnd] || key && previous[end][key] === value[newEnd][key]); end--, newEnd--) {
        temp[newEnd] = previous[end];
      }

      // prepare a map of all indices in value
      newIndicesNext = new Array(newEnd + 1);

      for (j = newEnd; j >= start; j--) {
        item = value[j];
        keyVal = key ? item[key] : item;
        i = newIndices.get(keyVal);
        newIndicesNext[j] = i === undefined ? -1 : i;
        newIndices.set(keyVal, j);
      }

      // step through all old items to check reuse
      for (i = start; i <= end; i++) {
        item = previous[i];
        keyVal = key ? item[key] : item;
        j = newIndices.get(keyVal);
        if (j !== undefined && j !== -1) {
          temp[j] = previous[i];
          j = newIndicesNext[j];
          newIndices.set(keyVal, j);
        }
      }

      // set all the new values
      for (j = start; j < value.length; j++) {

        if (temp.hasOwnProperty(j)) {

          if (previous[j] !== temp[j]) {
            if (temp[j] === undefined) {
              delete previous[j];
            } else {
              previous[j] = temp[j];
            }
          }

          patchState(previous, j, value[j], key);

        } else {

          if (previous[j] !== value[j]) {
            if (value[j] === undefined) {
              delete previous[j];
            } else {
              previous[j] = value[j];
            }
          }

        }

      }

    } else {

      for (let i = 0, len = value.length; i < len; i++) {
        patchState(previous, i, value[i], key);
      }

    }

    if (previous.length > value.length) {
      previous.length = value.length;
    }

  } else {

    const valueKeys = Object.keys(value);
    for (let i = 0, len = valueKeys.length; i < len; i++) {
      patchState(previous, valueKeys[i], value[valueKeys[i]], key);
    }

    const previousKeys = Object.keys(previous);
    for (let i = 0, len = previousKeys.length; i < len; i++) {
      if (value[previousKeys[i]] === undefined && previous[previousKeys[i]] !== undefined) {
        delete previous[previousKeys[i]];
      }
    }

  }

}