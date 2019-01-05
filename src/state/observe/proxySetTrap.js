
function proxySetTrap(target, prop, value) {

  //TODO: set parent and ownPropertyName of values that are cue-states here.

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