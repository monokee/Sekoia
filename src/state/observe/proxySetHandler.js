
function proxySetHandler(target, prop, value) {

  if (!isReacting) {

    const instance = target[__CUE__];

    if (typeof value === 'object' && value !== null) {

      const nestedState = value[__CUE__];

      if (nestedState && nestedState.parent === null) {
        nestedState.parent = target;
        nestedState.ownPropertyName = prop;
      }

      const oldValue = instance.valueCache.get(prop);

      if (!areShallowEqual(value, oldValue)) {

        if (instance.attemptCue(prop, value, oldValue)) {

        } else if (instance.parent.attemptCue.call(instance.parent, instance.ownPropertyName, instance.parent, instance.parent)) {

        }

      }

    }

  }

  // TODO: if value and cachedValue are pojo or array, shallow compare
  // if

  if (!isReacting && value !== this.valueCache.get(prop)) {

    _set(target, prop, value);
    this.valueCache.set(prop, value ? value[_SOURCE_DATA_] || value : value);

    // attemptCue property observers + derivatives + check for required extension
    // Note: "attemptCue" will add existing observers + derivatives to MAIN_QUEUE and return true. if there was nothing to add it returns false
    if (this.attemptCue('set', prop, value, undefined)) {

      if (this.attemptCueParent) {
        this.attemptCueParent('setChild', this.ownPropertyName, target, {childProperty: prop, mutationType: 'set'});
      }

      if (!isAccumulating) {
        react();
      }

      return true;

    } else if (this.attemptCueParent && this.attemptCueParent('setChild', this.ownPropertyName, target, {childProperty: prop, mutationType: 'set'})) {

      if (!isAccumulating) {
        react();
      }

      return true;

    }

  }

}