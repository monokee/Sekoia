
class Reactor {

  constructor(target) {

    if (typeof target !== 'object') {
      throw new TypeError(`Can't create Reactor with the provided target because it has to be of type 'object' but is "${typeof target}".`);
    } else if (target[_IS_REACTOR_TARGET_]) {
      throw new TypeError(`Can't create Reactor because the provided target object is already wrapped by another Reactor.`);
    }

    this.target = target;

    // extend target object for cleaning up when target is removed externally
    Object.defineProperties(target, {
      [_IS_REACTOR_TARGET_]: { value: true, configurable: true },
      [_DISPOSE_REACTOR_]:   { value: () => this.dispose(), configurable: true },
    });

    this.source = undefined;
    this.observedProperties = new Set();

  }

  attachTo(source) {

    if (this.source) throw new ReferenceError(`Observer already has a source. Detach from the existing source before attaching to a new one.`);
    if (typeof source !== 'object') throw new TypeError(`Can't observe source because it has to be of type 'object' but is "${typeof source}".`);

    this.source = source[_PROXY_MODEL_] || source;

    return this;

  }

  detach() {

    if (!this.source) throw new ReferenceError(`Can't clear non-existing source.`);

    if (this.source[_IS_OBSERVABLE_] && this.observedProperties.size) {
      this.unobserveProperties();
    }

    this.source = undefined;

    return this;

  }

  dispose() {

    this.unobserveProperties();

    delete this.target[_IS_REACTOR_TARGET_];
    delete this.target[_DISPOSE_REACTOR_];

    this.source = undefined;
    this.target = undefined;
    this.observedProperties = undefined;

  }

  observeProperty(property, handler, autorun) {

    if (!this.source) throw new ReferenceError(`Can't observe because no observation source has been assigned to observer!`);
    if (typeof handler !== 'function') throw new TypeError(`Can't observe property "${property}" because the provided handler is of type "${typeof handler}".`);

    if (!this.source[_IS_OBSERVABLE_]) {
      this.source = Observable.create(this.source, this.sourceParent, this.sourceOwnPropertyName);
    }

    const value = this.source[property];
    let plainData = value;
    const derivative = this.source[_DERIVED_PROPERTIES_].get(property);
    const source_observers = this.source[_OBSERVERS_OF_];

    const observer = new Observer(this, handler);

    this.source[_REACTORS_].add(this); // set -> only adds reactor if it doesn't already have it
    this.observedProperties.add(property);

    if (typeof value === 'object' && value !== null) {

      // changes to immediate children of objects bubble to the parent so any nested objects must be made observable as well
      if (value[_IS_OBSERVABLE_]) {
        plainData = value[_SOURCE_DATA_];
      } else if (value[_PROXY_MODEL_]) {
        this.source[property] = value[_PROXY_MODEL_];
      } else if (!derivative) {
        // unobserved object that is not a derivative. make it observable
        Observable.create(value, this.source, property);
      }

    }

    if (derivative) {
      derivative.observers.push(observer);
      setEndOfPropagationInBranchOf(derivative, TRAVERSE_DOWN);
    }

    if (source_observers.has(property)) {
      source_observers.get(property).push(observer);
    } else {
      source_observers.set(property, [ observer ]);
    }

    if (autorun === true) {
      observer.react(new Observation('set', property, plainData, undefined));
    }

    return this;

  }

  observeProperties(propHandlers, autorun) {

    if (!this.source) throw new ReferenceError(`Can't observe because no observation source has been assigned to observer!`);
    if (typeof propHandlers !== 'object') throw new TypeError(`Can't observe properties because the propHandler is not a pojo with shape: {property: function}`);

    if (!this.source[_IS_OBSERVABLE_]) {
      this.source = Observable.create(this.source);
    }

    this.source[_REACTORS_].add(this);
    const source_observers = this.source[_OBSERVERS_OF_];
    const source_derivatives = this.source[_DERIVED_PROPERTIES_];

    let prop, observer, value, plainData, derivative;
    for (prop in propHandlers) {

      if (typeof propHandlers[prop] !== 'function') {
        throw new TypeError(`Reaction for "${prop}" has to be a function but is of type "${typeof propHandlers[prop]}".`);
      }

      value = this.source[prop];
      plainData = value;
      derivative = source_derivatives.get(prop);

      observer = new Observer(this, propHandlers[prop]);

      this.observedProperties.add(prop);

      if (typeof value === 'object' && value !== null) {

        if (value[_IS_OBSERVABLE_]) {
          plainData = value[_SOURCE_DATA_];
        } else if (value[_PROXY_MODEL_]) {
          this.source[prop] = value[_PROXY_MODEL_];
        } else if (!derivative) {
          Observable.create(value, this.source, prop);
        }

      }

      if (derivative) {
        derivative.observers.push(observer);
        setEndOfPropagationInBranchOf(derivative, TRAVERSE_DOWN);
      }

      if (source_observers.has(prop)) {
        source_observers.get(prop).push(observer);
      } else {
        source_observers.set(prop, [ observer ]);
      }

      if (autorun === true) {
        observer.react(new Observation('set', prop, plainData, undefined));
      }

    }

    return this;

  }

  unobserveProperty(property) {

    if (!this.observedProperties.has(property)) {
      throw new ReferenceError(`Can't unobserve property "${property}" because it is not being observed.`);
    } else {
      this.observedProperties.delete(property);
    }

    const derivative = this.source[_DERIVED_PROPERTIES_].get(property);

    if (derivative) {
      derivative.observers.splice(0, derivative.observers.length);
      setEndOfPropagationInBranchOf(derivative, TRAVERSE_UP);
    }

    // Remove this observer from the source object
    const source_observers = this.source[_OBSERVERS_OF_];
    const property_observers = source_observers.get(property);

    if (property_observers) {

      const removed = property_observers.filter(observer => observer.reactor !== this);

      if (removed.length === 0) {
        source_observers.delete(property);
      } else {
        source_observers.set(property, removed);
      }

    }

    if (this.observedProperties.size === 0) {
      this.source[_REACTORS_].delete(this);
    }

    // If no more ObserverArrays (after the previous deletion)
    if (source_observers.size === 0) {
      // dispose the observable because nothing is being observed anymore
      this.source.dispose();
      this.source = undefined;
      this.sourceParent = undefined;
      this.sourceOwnPropertyName = undefined;
    }

    // don't return so "this" can go out of scope.

  }

  unobserveProperties(properties) {

    const source_reactors = this.source[_REACTORS_];
    const source_observers = this.source[_OBSERVERS_OF_];
    const source_derivatives = this.source[_DERIVED_PROPERTIES_];

    let derivative, property_observers;

    properties || (properties = this.observedProperties);

    properties.forEach(property => {

      if (!this.observedProperties.has(property)) {
        throw new ReferenceError(`Can't unobserve property "${property}" because it is not being observed.`);
      } else {
        this.observedProperties.delete(property);
      }

      derivative = source_derivatives.get(property);

      if (derivative) {
        derivative.observers.splice(0, derivative.observers.length);
        setEndOfPropagationInBranchOf(derivative, TRAVERSE_UP);
      }

      property_observers = source_observers.get(property);

      if (property_observers) {

        property_observers = property_observers.filter(observer => observer.reactor !== this);

        if (property_observers.length === 0) {
          source_observers.delete(property);
        } else {
          source_observers.set(property, property_observers);
        }

      }

    });

    if (this.observedProperties.size === 0) {
      source_reactors.delete(this);
    }

    if (source_observers.size === 0) {
      this.source.dispose();
      this.source = undefined;
      this.sourceParent = undefined;
      this.sourceOwnPropertyName = undefined;
    }

  }

}