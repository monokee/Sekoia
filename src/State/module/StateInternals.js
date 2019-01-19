
class StateInternals {

  static assignTo(stateInstance, parent, ownPropertyName) {
    stateInstance[__CUE__] = new this(parent, ownPropertyName);
    return stateInstance;
  }

  constructor(parent = null, ownPropertyName = '') {

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

    if (this.derivedProperties.has(property)) {
      const derivative = this.derivedProperties.get(property);
      derivative.observers.push(_handler);
      setEndOfPropagationInBranchOf(derivative, TRAVERSE_DOWN);

    }

    return _handler;

  }

  removeChangeReaction(property, handler) {

    if (this.observersOf.has(property)) {

      const reactions = this.observersOf.get(property);
      const derivative = this.derivedProperties.get(property);

      if (handler === undefined) {

        this.observersOf.delete(property);

        if (derivative) {
          derivative.observers.splice(0, derivative.observers.length);
          setEndOfPropagationInBranchOf(derivative, TRAVERSE_UP);
        }

      } else if (typeof handler === 'function') {

        let i = reactions.indexOf(handler);

        if (i > -1) {
          reactions.splice(i, 1);
        } else {
          console.warn(`Can't remove the passed handler from reactions of "${property}" because it is not registered.`);
        }

        if (derivative) {

          i = derivative.observers.indexOf(handler);

          if (i > -1) {
            derivative.observers.splice(i, 1);
            setEndOfPropagationInBranchOf(derivative, TRAVERSE_UP);
          } else {
            console.warn(`Can't remove the passed handler from observers of derived property "${property}" because it is not registered.`);
          }

        }

      }

    } else {
      console.warn(`Can't unobserve property "${property}" because no reaction has been registered for it.`);
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

      return 1;

    } else {

      return 0;

    }

  }

}