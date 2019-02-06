
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
   * @param {object}  props             - The props passed to an initial factory function call that created the instance.
   * @param {object} [parent]           - The parent object graph that the stateInstance is a child of
   * @param {string} [ownPropertyName]  - The property name of the stateInstance on the parent object graph
   * */
  static assignTo(stateInstance, module, props, parent, ownPropertyName) {
    stateInstance[__CUE__] = new this(module, stateInstance, props, parent, ownPropertyName);
    return stateInstance;
  }

  /** Creates new instance of internals required for reactivity engine */
  constructor(stateInstance, module, props, parent = null, ownPropertyName = '') {

    // INSTANCE SPECIFIC STUFF:
    this.instance = stateInstance; // the reactive host data instance that these internals are attached to

    this.parent = parent; // may be null at construction time
    this.ownPropertyName = ownPropertyName; // may be unknown at construction time

    this.initialProps = props; // can be nullified after the props have been merged into the state. required for calling "initialize" in instanceDidMount
    this.isInitializing = false; // flag set while the "initialize" method of state instances is being executed. (blocks certain ops)

    this.valueCache = new Map(); // 1D map [propertyName -> currentValue]
    this.observersOf = new Map(); // 1D map [propertyName -> handler]
    this.derivativesOf = new Map(); // 2D map [propertyName -> 1D array[...Derivatives]]
    this.derivedProperties = new Map(); // 1D map [propertyName -> Derivative]
    this.providersOf = new Map(); // 1D map [ownPropertyName -> provider{sourceInstance: instance of this very class on an ancestor state, sourceProperty: name of prop on source}]

    // MODULE STUFF: (pointers to the shared underlying module)
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
   * Called from "set" interceptor when the instance has been attached to a parent node graph.
   * Completes instance initialization logic. */
  instanceDidMount(parent, ownPropertyName) {

    // For this to work provided properties should be installed as forwarding getters on the prototype like computed properties. (they are conceptually similar after all)

    // ALSO: The entire provider/consumer mechanism currently only works for root properties on an instance. If however an instance has specified a non-instance sub-object, should those properties
    // also be providable, and should they be consumable by properties on non-instance sub-objects of their children? If so, we need to change a few things:
    // - instead of property collection, we need to collect paths from the root instance of both providers and consumers.
    // - we need to explicitly forbid dots (.) in Module names and enforce other means of namespacing (hyphens etc) so that we can use dots exclusively for property path access.
    // - I think this feature should be provided because it would complete the idea and not come with much performance overhead (it's just an additional recursion into the sub-nodes of an instance).
    //

    // 1. Assign Hierarchy
    this.parent = parent;
    this.ownPropertyName = ownPropertyName;

    // 2. Inject Providers
    if (this.module.providersToInstall.size > 0) {
      this.injectProviders();
    }

    // 3. Create Derivatives from module blueprints
    if (this.module.computed.size > 0) {
      this.installDerivatives();
    }

    this.isInitializing = true;
    this.module.initialize.call(this.instance, this.initialProps);
    this.initialProps = undefined;
    this.isInitializing = false;

  }

  injectProviders() {

    let description, sourceModule, sourceProperty, targetModule, targetProperty;
    for (description of this.module.providersToInstall.values()) {

      // only install providers onto children when they are allowed to mutate the providing parent state
      if (description.readOnly === false) {

        sourceModule = description.sourceModule;
        sourceProperty = description.sourceProperty;
        targetModule = description.targetModule;
        targetProperty = description.targetProperty;

        // Traverse through the parent hierarchy until we find the first parent that has been created from a module that matches the name of the providerModule
        let parent = this.parent;

        while (parent && parent[__CUE__].name !== sourceModule) {
          parent = parent[__CUE__].parent;
        }

        if (parent) { // found a parent instance that matches the consuming child module name

          parent = parent[__CUE__];

          // -> inject the provider!
          // we have previously installed forwarding accessors on the prototype that will reach into the map on this instance:
          this.providersOf.set(targetProperty, {sourceInstance: parent, sourceProperty, targetModule, targetProperty});

        } else {

          // If we traversed until there are no more parents and we haven't found a state created from our providerModule, throw:
          throw new Error(`[${targetModule}]: Can't inject "${targetProperty}" from "${sourceModule}" because it's not an ancestor of the injecting module instance.`);

        }

      }

    }

  }

  installDerivatives() {

    let vDerivative, i, derivative, sourceProperty, dependencies, superDerivative;
    for (vDerivative of this.module.computed.values()) {

      // 3.0 Create instance
      derivative = new Derivative(vDerivative.ownPropertyName, vDerivative.computation, vDerivative.sourceProperties);

      // 3.1 Install instance as derivedProp
      this.derivedProperties.set(vDerivative.ownPropertyName, derivative);

      // 3.2 Add derivative as derivativeOf of its sourceProperties (dependencyGraph)
      for (i = 0; i < vDerivative.sourceProperties.length; i++) {
        sourceProperty = vDerivative.sourceProperties[i];
        dependencies = this.derivativesOf.get(sourceProperty);
        if (dependencies) {
          dependencies.push(derivative);
        } else {
          this.derivativesOf.set(sourceProperty, [ derivative ]);
        }
      }

      // 3.3 Enhance Derivative for self-aware traversal
      for (i = 0; i < vDerivative.superDerivatives.length; i++) {
        // because the module derivatives are topologically sorted, we know that the superDerivative is available
        superDerivative = this.derivedProperties.get(vDerivative.superDerivatives[i].ownPropertyName);
        derivative.superDerivatives.push(superDerivative);
        superDerivative.subDerivatives.push(derivative);
      }

      // 3.4 Fill internal cache of Derivative
      // (instance inherits from factory.prototype which contains forwarding-getters which trigger value computation in Derivative)
      derivative.fillCache(this.instance);

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