export function deepClone(x) {

  if (!x || typeof x !== 'object') {
    return x;
  }

  if (Array.isArray(x)) {

    const y = [];

    for (let i = 0; i < x.length; i++) {
      y.push(deepClone(x[i]));
    }

    return y;

  }

  const y = {};

  for (const key in x) {
    if (x.hasOwnProperty(key)) {
      y[key] = deepClone(x[key]);
    }
  }

  return y;

}