
function deepCloneObjectOrArray(o) {

  // Deep cloning for plain Objects and Arrays

  if (o && o.constructor === Object) {
    return deepClonePlainObject(o);
  }

  if (isArray(o)) {
    return deepCloneArray(o);
  }

}

function deepClonePlainObject(o) {

  const clone = {};

  let i, v;

  for (i in o) {
    v = o[i];
    clone[i] = typeof v === 'object' ? deepCloneObjectOrArray(v) : v;
  }

  return clone;

}

function deepCloneArray(o) {

  const clone = [];

  for (let i = 0, v; i < o.length; i++) {
    v = o[i];
    clone[i] = typeof v === 'object' ? deepCloneObjectOrArray(v) : v;
  }

  return clone;

}