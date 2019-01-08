
function assignStateInstanceProperties(stateInstance) {

  return Object.defineProperty(stateInstance, __CUE__, {
    value: {
      uid: Symbol(),
      parent: null,
      ownPropertyName: '',
      isInitializing: false,
      fnCache: new Map(),
      valueCache: new Map(),
      observersOf: new Map(),
      derivativesOf: new Map(),
      derivedProperties: new Map(),
      addChangeReaction: addStateChangeReaction,
      removeChangeReaction: removeStateChangeReaction,
      attemptCue: attemptCue
    },
    configurable: true
  });

}

function addStateChangeReaction(property, handler, scope = null) {

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

function removeStateChangeReaction(property, handler) {

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

function attemptCue(prop, value, oldValue) {

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