
assign(CUE_PROTO, {

  flattenArray(multiDimensionalArray) {
    return multiDimensionalArray.reduce((x, y) => x.concat(Array.isArray(y) ? this.flattenArray(y) : y), []);
  },

  insertAtEvery(array, item, step) {

    // Insert an item every step items.
    step = Math.max(step, 1);

    const sl = array.length; // source length
    const tl = Math.floor(sl + (sl / step)); // target length
    const cl = Math.floor(tl / step); // target chunk length

    let newArray = [];

    for (let x = 0; x < cl; x++) {

      if (newArray.length + step < tl) {

        for (let y = 0; y < step; y++) {
          newArray.push(array[y + (x * step)]);
        }

        newArray.push(item);

      } else {

        const tail = Math.max(tl - newArray.length, 0);
        newArray = newArray.concat(array.slice(sl - tail, sl + 1));
        break;

      }

    }

    array = newArray;

    return this;

  },

  removeAtEvery(array, step) {
    let i = Math.floor(array.length / step);
    while (i--) array.splice((i + 1) * step - 1, 1);
    return this;
  },

  removeRangeFromArray(array, from, to) {
    array.splice(from, to - from);
    return this;
  },

  mergeArrays(array1, array2, at = array1.length) {

    at = Math.min(Math.max(at, 0), array1.length);

    const il = array2.length;
    const tl = array1.length - at;
    const tail = new Array(tl);

    let i;
    for(i = 0; i < tl; i++) tail[i] = array1[i + at];
    for(i = 0; i < il; i++) array1[i + at] = array2[i];
    for(i = 0; i < tl; i++) array1[i + il + at] = tail[i];

    return this;

  },

  scaleArray(array, targetLength) {

    // 1D Linear Interpolation
    const il = array.length - 1, ol = targetLength - 1, s = il / ol;

    let a = 0, b = 0, c = 0, d = 0;

    for (let i = 1; i < ol; i++) {
      a = i * s; b = Math.floor(a); c = Math.ceil(a); d = a - b;
      array[i] = array[b] + (array[c] - array[b]) * d;
    }

    array[ol] = array[il];

    return this;

  },

  closestValueInArray(array, val) {
    // get closest match to value in array
    return array.reduce((prev, curr) => {
      return (Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
    });
  },

  closestSmallestValueInArray(array, value) {
    const closest = this.closestValueInArray(array, value);
    return value >= closest ? closest : array[array.indexOf(closest) - 1];
  },

  closestLargestValueInArray(array, value) {
    const closest = this.closestValueInArray(array, value);
    return value <= closest ? closest : array[array.indexOf(closest) + 1];
  },

  largestValueInArray(array) {
    let max = -Infinity;
    for (let i = 0; i < array.length; i++) {
      if (array[i] > max) max = array[i];
    }
    return max === -Infinity ? void 0 : max;
  },

  smallestValueInArray(array) {
    let min = Infinity;
    for (let i = 0; i < array.length; i++) {
      if (array[i] < min) min = array[i];
    }
    return min === Infinity ? void 0 : min;
  }

});