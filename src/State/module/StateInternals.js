
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
    stateInstance[__CUE__] = new this(module, parent, ownPropertyName);
    return stateInstance;
  }

  /** Creates new instance of internals required for reactivity */
  constructor(module, parent = null, ownPropertyName = '') {

    this.module = module;

    this.parent = parent;
    this.ownPropertyName = ownPropertyName;

    this.isInitializing = false;

    this.valueCache = new Map(); // 1D map [propertyName -> currentValue]
    this.observersOf = new Map(); // 1D map [propertyName -> handler]
    this.derivativesOf = new Map(); // 2D map [propertyName -> 1D array[...Derivatives]]
    this.derivedProperties = new Map(); // 1D map [propertyName -> Derivative]

    // when consumers of a parent prop "get" a consumed prop, the "get" request is forwarded to the provider (parentState[nameOfPropAsDefinedByParent]).
    // when a state has providers of a property, mutation calls (set, delete, arrayMutators) are forwarded to the provider (parentState[nameOfPropAsDefinedByParent]).
    // when a state has consumers of a property, it propagates the mutationHandler "propertyDidChange" downwards to its consumers (mutate: childState[nameOfPropAsDefinedByChild]).

    this.consumersOf = new Map(); // 2D map [propertyName -> 1D array[...Consumers]]  Consumer = {stateInternals: childStateInstance[__CUE__], property: nameOfPropAsDefinedByChild}
    this.providersOf = new Map(); // 1D map [propertyName -> Provider]                Provider = {stateInternals: parentStateInstance[__CUE__], property: nameOfPropAsDefinedByParent}

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
    const consumers = this.consumersOf.get(prop);

    // 1. recurse over direct dependencies
    if (observers || derivatives) {
      if (isAccumulating) {
        cueImmediate(prop, value, oldValue, observers, derivatives, false);
      } else {
        cueAll(prop, value, oldValue, observers, derivatives, false);
      }
    }

    // 2. propagate change to consuming child modules
    if (consumers) {
      for (let i = 0, consumer; i < consumers.length; i++) {
        consumer = consumers[i];
        consumer.stateInternals.propertyDidChange(consumer.property, value, oldValue);
      }
    }

  }

}