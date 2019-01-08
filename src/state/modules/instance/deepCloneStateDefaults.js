
function deepCloneStateDefaults(o) {

  // Deep cloning for plain Arrays and Objects

  if (isArray(o)) {

    const clone = [];

    for (let i = 0, v; i < o.length; i++) {
      v = o[i];
      clone[i] = typeof v === 'object' ? deepCloneStateInstance(v) : v;
    }

    return clone;

  }

  if (o && o.constructor === Object) {

    const clone = {};

    let i, v;

    for (i in o) {
      v = o[i];
      clone[i] = typeof v === 'object' ? deepCloneStateInstance(v) : v;
    }

    return clone;

  }

}