
class CueStateInternals {

  static assignTo(stateInstance, parent, ownPropertyName) {
    return Object.defineProperty(stateInstance, __CUE__, {
      value: new this(parent, ownPropertyName),
      configurable: true
    });
  }

  constructor(parent = null, ownPropertyName = '') {
    this.uid = Symbol();
    this.parent = parent;
    this.ownPropertyName = ownPropertyName;
    this.isInitializing = false;
    this.valueCache = new Map();
    this.observersOf = new Map();
    this.derivativesOf = new Map();
    this.derivedProperties = new Map();
  }

  addChangeReaction(property, handler, scope = null) {

    if (typeof handler !== 'function') {
      throw new TypeError(`Property change reaction for "${property}" is not a function...`);
    }

    const _handler = scope === null ? handler : handler.bind(scope);

    if (this.observersOf.has(property)) {
      this.observersOf.get(property).push(_handler);
    } else {
      this.observersOf.set(property, [ _handler ]);
    }

    return _handler;

  }

  removeChangeReaction(property, handler) {

    if (this.observersOf.has(property)) {

      const reactions = this.observersOf.get(property);

      if (handler === undefined) {
        this.observersOf.delete(property);
      } else if (typeof handler === 'function') {
        const i = reactions.indexOf(handler);
        if (i > -1) {
          reactions.splice(i, 1);
        } else {
          console.warn(`Can't remove the passed handler from reactions of "${property}" because it is not registered.`);
        }
      }

    } else {
      console.warn(`Can't unobserve property "${property}" because no reaction has been registered for it.`);
    }

  }

  installDerivativeOf(prop, derivative) {

    if (this.derivativesOf.has(prop)) {
      this.derivativesOf.get(prop).push(derivative);
    } else {
      this.derivativesOf.set(prop, [ derivative ]);
    }

    // add the property key to the derivatives' dependencies
    derivative.addDependency(prop);

    // if the property is a derivative itself:
    if (this.derivedProperties.has(prop)) {
      const sourceDerivative = this.derivedProperties.get(prop);
      sourceDerivative.addSubDerivative(derivative);
      derivative.addSuperDerivative(sourceDerivative);
    }

  }

  attemptCue(prop, value, oldValue) {

    const drv = this.derivativesOf.get(prop);
    const obs = this.observersOf.get(prop);

    if (drv || obs) {

      if (isAccumulating) {
        cueImmediate(prop, value, oldValue, obs, drv, false);
      } else {
        cueAll(prop, value, oldValue, obs, drv, false);
      }

      return true;

    } else {

      return false;

    }

  }

}