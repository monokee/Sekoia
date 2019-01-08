
function proxySetHandler(target, prop, value) {

  if (!isReacting) {

    const instance = target[__CUE__];
    const oldValue = instance.valueCache.get(prop);

    if (value) {

      const nestedInstance = value[__CUE__];

      if (nestedInstance && nestedInstance.parent === null) {
        nestedInstance.parent = target;
        nestedInstance.ownPropertyName = prop;
      }

    }

    if (value !== oldValue) {

      let inQueue = instance.attemptCue(prop, value, oldValue);

      if (instance.parent !== null) {
        const oldTarget = Array.isArray(target) ? target.slice() : Object.assign({}, target);
        inQueue += instance.parent.attemptCue.call(instance.parent, instance.ownPropertyName, target, oldTarget);
      }

      _set(target, prop, value);
      instance.valueCache.set(prop, value);

      if (inQueue > 0 && !isAccumulating) {
        react();
      }

      return true;

    }

  } else {

    console.warn(`Setting of "${prop}" ignored. Don't mutate state in a reaction. Refactor to computed properties instead.`);

  }

}