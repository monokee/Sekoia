
/**
 * Attaches itself to a reactive state instance under private [__CUE__] symbol.
 * Properties and methods are required for reactivity engine embedded into every Cue State Instance
 * @class StateInternals
 * */
class StateInternals {

  /**
   * Assign new StateInternals to private expando
   * @param {object}  stateInstance     - The piece of state that the internals should be assigned to.
   * @param {object}  module            - The module blueprint that the instance is based on.
   * @param {object} [parent]           - The parent object graph that the stateInstance is a child of
   * @param {string} [ownPropertyName]  - The property name of the stateInstance on the parent object graph
   * */
  static assignTo(stateInstance, module, parent, ownPropertyName) {
    stateInstance[__CUE__] = new this(module, stateInstance, parent, ownPropertyName);
    return stateInstance;
  }

  /** Creates new instance of internals required for reactivity engine */
  constructor(stateInstance, module, parent, ownPropertyName) {

    this.instance = stateInstance; // the reactive host data instance that these internals are attached to

    this.parent = parent; // may be null at construction time
    this.ownPropertyName = ownPropertyName; // may be unknown at construction time

    this.isInitializing = false; // flag set while the "initialize" method of state instances is being executed. (blocks certain ops)

    this.valueCache = new Map(); // 1D map [propertyName -> currentValue]
    this.observersOf = new Map(); // 1D map [propertyName -> handler]
    this.derivativesOf = new Map(); // 2D map [propertyName -> 1D array[...Derivatives]]
    this.derivedProperties = new Map(); // 1D map [propertyName -> Derivative]
    this.providersOf = new Map(); // 1D map [ownPropertyName -> provider{sourceInstance: instance of this very class on an ancestor state, sourceProperty: name of prop on source}]

    // only a pointer to the module (shared)
    this.module = module;
    this.name = module.name;
    this.consumersOf = module.consumersOf; // 2D map [propertyName -> [...ConsumerDescriptions]] ConsumerDescription = {targetModule: nameOfTargetModule, targetProperty: nameOfPropertyAsDefinedOnChild}

  }

  /**
   * Add reaction handler to the list of "observersOf" under the property name they observe.
   * @param   {object}    stateInstance     - The piece of state that should be observed
   * @param   {string}    property          - The property name on the state instance that should be observed
   * @param   {function}  handler           - The reaction that should be executed whenever the value of the observed property has changed
   * @param   {object}    scope             - The "this" context the handler should be executed in (pre-bound)
   * @param   {boolean}   [autorun = true]  - Whether the handler should be run once immediately after registration.
   * @returns {function}  boundHandler      - The handler which has been bound to the passed scope.
   */
  addChangeReaction(stateInstance, property, handler, scope, autorun = true) {

    if (!isFunction(handler)) {
      throw new TypeError(`Property change reaction for "${property}" is not a function...`);
    }

    const boundHandler = handler.bind(scope);

    if (this.observersOf.has(property)) {
      this.observersOf.get(property).push(boundHandler);
    } else {
      this.observersOf.set(property, [ boundHandler ]);
    }

    if (this.derivedProperties.has(property)) {
      const derivative = this.derivedProperties.get(property);
      derivative.observers.push(boundHandler);
      setEndOfPropagationInBranchOf(derivative, TRAVERSE_DOWN);
    }

    if (autorun === true) {
      const val = stateInstance[property];
      boundHandler({value: val, oldValue: val});
    }

    return boundHandler;

  }

  /**
   * Remove reaction handler(s) from "observersOf"
   * @param {string}    property  - The property key of the state property that should be unobserved
   * @param {function}  [handler] - The reaction handler to be removed. If not provided, remove all reactions for the passed property name
   */
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

      } else if (isFunction(handler)) {

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

  /**
   * Called from proxy interceptors when a value change of a state property has been detected.
   * First it queues up the observers of the property and all direct + indirect derivatives of the property. (cueAll/cueImmediate)
   * Then it propagates the change reaction recursively downwards by calling itself on all child instances that consume the property.
   * @param   {string}  prop      - The property name of the changed value.
   * @param   {*}       value     - The new value (after mutation)
   * @param   {*}       oldValue  - The previous value (before mutation)
   */
  propertyDidChange(prop, value, oldValue) {

    const observers = this.observersOf.get(prop);
    const derivatives = this.derivativesOf.get(prop);

    // 1. recurse over direct dependencies
    if (observers || derivatives) {
      if (isAccumulating) {
        cueImmediate(prop, value, oldValue, observers, derivatives, false);
      } else {
        cueAll(prop, value, oldValue, observers, derivatives, false);
      }
    }

    const consumers = this.consumersOf.get(prop);

    // 2. if the changed property has consumers, find them and recurse
    if (consumers) {
      this.cueConsumers(this, consumers, prop, value, oldValue);
    }

  }

  cueConsumers(providerInstance, consumers, prop, value, oldValue) {

    // Find consumer instances and recurse into each branch

    let key, childState;
    for (key in this.instance) {

      childState = this.instance[key];

      if (childState && (childState = childState[__CUE__])) { // property is a child state instance

        let provider;
        for (provider of childState.providersOf.values()) { // TODO: we can probably cache the iterator returned from values()!
          if (provider.sourceInstance === providerInstance && provider.sourceProperty === prop) {
            // this will branch off into its own search from a new root for a new property in case the provided property is passed down at multiple levels in the state tree...
            childState.propertyDidChange.call(childState, provider.targetProperty, value, oldValue); // continue recursion in this branch
          }
        }

        // even if we did find a match above we have to recurse, potentially creating a parallel search route (if the found provided prop is provided further)
        childState.cueConsumers.call(childState, providerInstance, consumers, prop, value, oldValue);

      }

    }

  }

}