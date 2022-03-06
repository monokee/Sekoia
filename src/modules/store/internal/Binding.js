export class Binding {

  // a link between reactive objects that are not in the same state branch
  constructor(sourceInternals, key, readonly) {
    this.sourceInternals = sourceInternals;
    this.ownPropertyName = key;
    this.readonly = readonly; // true when bound to upstream computed property
    this.connectedObjectInternals = new Map(); // [reactiveObjectInternals -> key]
  }

  connect(reactiveObjectInternals, boundKey) {

    if (reactiveObjectInternals === this.sourceInternals) {
      throw new Error(`Failed to bind "${boundKey}". Cannot bind object to itself.`);
    } else if (this.connectedObjectInternals.has(reactiveObjectInternals)) {
      throw new Error(`Failed to bind "${boundKey}". Cannot bind to an object more than once.`);
    } else {
      this.connectedObjectInternals.set(reactiveObjectInternals, boundKey);
    }

  }

  observeSource(callback, cancelable, silent) {
    return this.sourceInternals.observe(this.ownPropertyName, callback, cancelable, silent);
  }

  getValue(writableOnly) {
    return this.sourceInternals.getDatum(this.ownPropertyName, writableOnly);
  }

  getDefaultValue() {
    return this.sourceInternals.getDefaultDatum(this.ownPropertyName);
  }

  setValue(value, silent) {
    this.sourceInternals.setDatum(this.ownPropertyName, value, silent);
  }

}

Binding.prototype._isBinding_ = true;