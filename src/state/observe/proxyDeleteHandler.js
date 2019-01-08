
function proxyDeleteHandler(target, prop) {

  if (!isReacting) {

    if (this.derivedProperties.has(prop)) {
      this.derivedProperties.get(prop).dispose(true);
    }

    _delete(target, prop);

    this.valueCache.delete(prop);

    this.attemptCue('delete', prop, undefined, undefined);

    if (this.attemptCueParent) {
      this.attemptCueParent('deleteChild', this.ownPropertyName, target, {childProperty: prop, mutationType: 'delete'});
    }

    if (!isAccumulating) {
      react();
    }

    return true;

  }

}