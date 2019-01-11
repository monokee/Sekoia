
class StateInstance {

  static create(type, factory, module, _parent, _ownPropertyName) {

    // 1. Create base instance
    const instance = type === 'object'
      ? Object.assign(Object.create(factory.prototype), deepClonePlainObject(module.defaults))
      : appendToArray(Object.setPrototypeOf([], factory.prototype), deepCloneArray(module.defaults));

    // 2. Assign __CUE__ private extension
    Object.defineProperty(instance, __CUE__, {
      value: new this(_parent, _ownPropertyName),
      configurable: true
    });

    const internal = instance[__CUE__];

    // 3. Create Derivatives from module blueprints

    // 3.1. turn all vDerivatives into Derivative instances
    module.computed.entities.forEach(vDerivative => {
      internal.derivedProperties.set(vDerivative.ownPropertyName, new Derivative(vDerivative.computation, vDerivative.sourceProperties));
    });

    // 3.2. loop over all vDerivatives again
    module.computed.entities.forEach(vDerivative => {

      // 3.2.1. get corresponding actual derivative
      const derivative = internal.derivedProperties.get(vDerivative.ownPropertyName);

      // 3.2.2. install all subDerivatives of actual derivative
      for (let i = 0; i < vDerivative.subDerivatives.length; i++) {
        derivative.subDerivatives.push(internal.derivedProperties.get(vDerivative.subDerivatives[i].ownPropertyName));
      }

      // 3.2.3. install all superDerivatives of actual derivative
      for (let i = 0; i < vDerivative.superDerivatives.length; i++) {
        derivative.superDerivatives.push(internal.derivedProperties.get(vDerivative.superDerivatives[i].ownPropertyName));
      }

    });

  }

  static assignTo(stateInstance, parent, ownPropertyName) {
    return Object.defineProperty(stateInstance, __CUE__, {
      value: new this(parent, ownPropertyName),
      configurable: true
    });
  }

  constructor(parent = null, ownPropertyName = '') {

    this.parent = parent;
    this.ownPropertyName = ownPropertyName;

    this.isInitializing = false;

    this.props = {
      propA: {
        currentValue: 123,
        observers: [],
        derivations: [],
        derivative: null
      },
      propB: {

      }
    };

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

  removeDerivative(prop) {
    const derivative = this.derivedProperties.get(prop);
    derivative.dispose(true);
    this.derivedProperties.delete(prop);
    this.derivativesOf.forEach((prop, derivatives) => {
      const i = derivatives.indexOf(derivative);
      if (i > -1) derivatives.splice(i, 1);
    });
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