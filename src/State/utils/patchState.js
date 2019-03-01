
/**
 * State reconciliation to "batch-patch" data collections into the current state tree.
 * Instead of replacing the entire tree, the algorithm attempts to mutate existing data points in the "parent[property]" object
 * to match the shape of the provided "value" object. This avoids unnecessary change-reactions throughout the system.
 * @param parent    - The parent object graph holding a property that contains the object to be patched. When parent is reactive, parent is the proxy object, not the plain data.
 * @param property  - The target property name of the object to be patched on the parent node graph.
 * @param value     - The object dictating the future shape of parent[property].
 */
function patchState(parent, property, value) {

  const previous = parent[property];

  if (value === previous) {
    return;
  }

  if (value === undefined) {
    delete parent[property];
    return;
  }

  if (previous === null || previous === undefined || value === null || typeof value !== 'object') {
    parent[property] = value;
    return;
  }

  if (isArray(value)) {

    const vLen = value.length;
    const pLen = previous.length;

    if (vLen && pLen) {

      let i, j, start, end, newEnd, item, newIndicesNext;
      const temp = new Array(vLen);
      const newIndices = new Map();

      for (start = 0, end = Math.min(pLen, vLen); start < end && (previous[start] === value[start]); start++) {
        patchState(previous, start, value[start]);
      }

      for (end = pLen - 1, newEnd = vLen - 1; end >= 0 && newEnd >= 0 && (previous[end] === value[newEnd]); end--, newEnd--) {
        temp[newEnd] = previous[end];
      }

      newIndicesNext = new Array(newEnd + 1);

      for (j = newEnd; j >= start; j--) {
        item = value[j];
        i = newIndices.get(item);
        newIndicesNext[j] = i === undefined ? -1 : i;
        newIndices.set(item, j);
      }

      for (i = start; i <= end; i++) {
        item = previous[i];
        j = newIndices.get(item);
        if (j !== undefined && j !== -1) {
          temp[j] = previous[i];
          j = newIndicesNext[j];
          newIndices.set(item, j);
        }
      }

      for (j = start; j < vLen; j++) {

        if (temp.hasOwnProperty(j)) {

          if (previous[j] !== temp[j]) {
            if (temp[j] === undefined) {
              delete previous[j];
            } else {
              previous[j] = temp[j];
            }
          }

          patchState(previous, j, value[j]);

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

      for (let i = 0; i < vLen; i++) {
        patchState(previous, i, value[i]);
      }

    }

    if (pLen > vLen) {
      previous.length = value.length;
    }

  } else {

    const valueKeys = oKeys(value);
    for (let i = 0, vk; i < valueKeys.length; i++) {
      vk = valueKeys[i];
      patchState(previous, vk, value[vk]);
    }

    const previousKeys = oKeys(previous);
    for (let i = 0, pk; i < previousKeys.length; i++) {
      pk = previousKeys[i];
      if (value[pk] === undefined && previous[pk] !== undefined) {
        delete previous[pk];
      }
    }

  }

}