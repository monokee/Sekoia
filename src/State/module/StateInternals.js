/**
 * Attaches itself to a reactive state instance under private [__CUE__] symbol.
 * Properties and methods are required for reactivity engine embedded into every Cue State Instance
 */
class StateInternals {

  constructor(module, type) {

    this.type = type;

    this.valueCache = new Map();

    // Pointer to underlying module (shared by all instances of module)
    this.module = module;
    this.imports = module.imports;
    this.mounted = false;

    this.internalGetters = EMPTY_MAP;
    this.internalSetters = EMPTY_MAP;

  }

  bubble() {

    // 1. bubble changes [d, o, s] through immediate module relationships (moduleChild -> moduleParent)
    // 2. bubble cueDerivatives through all ancestor modules to the root.

    // 1. Bubble the change through immediate module relationships
    let directParent = this.directParent;
    let ownProp = this.ownPropertyName;
    let ownValue = this.proxyState;

    // (only bubble top-level property changes as they are considered inherent modifications to objects (ie break on noChange)
    while (directParent.type === STATE_TYPE_MODULE) {

      directParent.cueObservers.call(directParent, ownProp, ownValue);
      directParent.cueDerivatives.call(directParent, ownProp);

      if (directParent.consumersOf.has(ownProp)) {
        directParent.cueConsumers.call(directParent, directParent, directParent.consumersOf.get(ownProp), ownProp);
      }

      ownProp = directParent.ownPropertyName;
      ownValue = directParent.proxyState;
      directParent = directParent.directParent;

    }

    // 2. If the immediate module chain did not reach all
    // the way to the root because it was interrupted by extension states,
    // we still bubble up but only for computations. these can reach deep into objects and thus
    // have to be reevaluated all the way through the affected branch to the root.
    // we explicitly don't care about top-level changes here because of infinite computation depth.
    if (directParent.type !== STATE_TYPE_ROOT) {

      let nextModuleParent = directParent.closestModuleParent;
      let branchPropertyName = directParent.branchPropertyName;

      while (nextModuleParent && nextModuleParent.type !== STATE_TYPE_ROOT) {
        nextModuleParent.cueDerivatives.call(nextModuleParent, branchPropertyName);
        branchPropertyName = nextModuleParent.branchPropertyName;
        nextModuleParent = nextModuleParent.closestModuleParent;
      }

    }

  }

  instanceWillUnmount() {
    //console.log('[todo: instanceWillUnmount]', this);
  }

}

class StateModuleInternals extends StateInternals {

  constructor(module, type) {
    super(module, type);
  }

  instanceDidMount(parent, ownPropertyName) {

    // ------------------INLINE "SUPER" CALL----------------------

    this.directParent = parent[__CUE__];
    this.ownPropertyName = ownPropertyName;

    let closestModuleParent = this.directParent;
    let branchPropertyName = ownPropertyName;
    while (closestModuleParent && closestModuleParent.type !== STATE_TYPE_MODULE) {
      branchPropertyName = closestModuleParent.ownPropertyName;
      closestModuleParent = closestModuleParent.closestModuleParent;
    }

    this.closestModuleParent = closestModuleParent; // the next upstream state object that is based on a module (can be the immediate parent!)
    this.branchPropertyName = branchPropertyName; // the property name of the enclosing object on the closest module parent

    // -------------------------------------------------------------

    this.name = this.module.name;
    this.internalGetters = this.module.internalGetters;
    this.internalSetters = this.module.internalSetters;
    this.consumersOf = this.module.consumersOf;

    this.observersOf = new Map();       // 1D map [propertyName -> handler]
    this.derivativesOf = new Map();     // 2D map [propertyName -> 1D array[...Derivatives]]
    this.derivedProperties = new Map(); // 1D map [propertyName -> Derivative]
    this.providersOf = new Map();       // 1D map [ownPropertyName -> provider{sourceInstance: instance of this very class on an ancestor state, sourceProperty: name of prop on source}]

    if (this.module.providersToInstall.size) {
      this.injectProviders();
    }

    if (this.module.derivativesToInstall.size) {
      this.installDerivatives();
    }

    this.mounted = true;

    this.module.initialize.call(this.proxyState, this.initialProps);

    this.initialProps = undefined;

  }

  propertyDidChange(prop, value) {

    // add own dependencies to cue.
    this.cueObservers(prop, value);
    this.cueDerivatives(prop);

    if (this.consumersOf.has(prop)) {
      this.cueConsumers(this, this.consumersOf.get(prop), prop, value);
    }

    this.bubble();

  }

  cueObservers(prop, value) {

    if (this.observersOf.has(prop)) {

      const observers = this.observersOf.get(prop);

      for (let i = 0; i < observers.length; i++) {
        // note that this will overwrite existing reactions with a new value when called multiple times within batch.
        REACTION_QUEUE.set(observers[i], value);
      }

    }

  }

  cueDerivatives(prop) {

    if (this.derivativesOf.has(prop)) {

      const derivatives = this.derivativesOf.get(prop);

      for (let i = 0, derivative; i < derivatives.length; i++) {
        derivative = derivatives[i];
        if (!DERIVATIVE_QUEUE.has(derivative)) {
          DERIVATIVE_QUEUE.set(derivative, this);
        }
      }

    }

  }

  cueConsumers(providerInstance, consumers, prop, value) {

    // Find consumer instances and recurse into each branch

    let key, childState;
    for (key in this.plainState) {

      childState = this.plainState[key];

      if (childState && (childState = childState[__CUE__])) { // property is a child state instance

        let provider;
        for (provider of childState.providersOf.values()) {

          if (provider.sourceInternals === providerInstance && provider.sourceProperty === prop) {

            childState.cueObservers.call(childState, provider.targetProperty, value);
            childState.cueDerivatives.call(childState, provider.targetProperty);

            // if the childState is providing the property further to its children, this will branch off into its own search from a new root for a new property name...
            if (childState.consumersOf.has(provider.targetProperty)) {
              childState.cueConsumers.call(childState, childState, childState.consumersOf.get(provider.targetProperty), provider.targetProperty, value);
            }

          }

        }

        // even if we did find a match above we have to recurse, potentially creating a parallel search route (if the provided prop is also provided from another upstream state)
        childState.cueConsumers.call(childState, providerInstance, consumers, prop, value);

      }

    }

  }

  injectProviders() {

    let description, sourceModule, sourceProperty, targetModule, targetProperty, rootProvider;
    for (description of this.module.providersToInstall.values()) {

      // only install providers onto children when they are allowed to mutate the providing parent state
      if (description.readOnly === false) {

        sourceModule = description.sourceModule;        // the name of the module-based source state that the provided property comes from
        sourceProperty = description.sourceProperty;   // the top-level property name on a state instance created from sourceModule.
        targetModule = description.targetModule;      // the name of the module that is consuming the property (here its this.module.name!)
        targetProperty = description.targetProperty; // the top-level property name on this instance that is consuming from the parent

        // Traverse through the parent hierarchy until we find the first parent that has been created from a module that matches the name of the providerModule
        let providingParent = this.closestModuleParent;

        while (providingParent && providingParent.name !== sourceModule) {
          providingParent = providingParent.closestModuleParent;
        }

        if (providingParent) { // found a parent instance that matches the consuming child module name

          // now we have to check if the found state instance is the actual source of the provided property or if it is also consuming it from another parent state.
          rootProvider = providingParent.providersOf.get(sourceProperty);

          if (rootProvider) { // the provider is a middleman that receives the data from another parent.
            rootProvider = getRootProvider(rootProvider);
          } else {
            rootProvider = { sourceInternals: providingParent, sourceProperty, targetModule, targetProperty };
          }

          // -> inject the rootProvider. We now have direct access to the data source on a parent, no matter how many levels of indirection the data has taken to arrive here.
          // all get and set requests to this piece of data will be directly forwarded to the source. Forwarded set mutations will recursively traverse back down through the state tree and notify each consumer along the way.
          this.providersOf.set(targetProperty, rootProvider);

        } else {

          // If we traversed until there are no more parents and we haven't found a state created from our providerModule, throw:
          throw new Error(`[${targetModule}]: Can't inject "${targetProperty}" from "${sourceModule}" because it's not an ancestor of the injecting module instance.`);

        }

      }

    }

  }

  installDerivatives() {

    let vDerivative, i, derivative, sourceProperty, superDerivative;
    for (vDerivative of this.module.derivativesToInstall.values()) { // topologically sorted installers.

      // 3.0 Create Derivative instance
      derivative = new Derivative(vDerivative.ownPropertyName, vDerivative.computation, vDerivative.sourceProperties);

      // 3.1 Install instance as derivedProp
      this.derivedProperties.set(vDerivative.ownPropertyName, derivative); // maintains topological insertion order

      // 3.2 Add derivative as derivativeOf of its sourceProperties
      for (i = 0; i < vDerivative.sourceProperties.length; i++) {

        sourceProperty = vDerivative.sourceProperties[i];

        if (this.derivativesOf.has(sourceProperty)) {
          this.derivativesOf.get(sourceProperty).push(derivative);
        } else {
          this.derivativesOf.set(sourceProperty, [derivative]);
        }

      }

      // 3.3 Enhance Derivative for self-aware traversal
      for (i = 0; i < vDerivative.superDerivatives.length; i++) {
        // because the module derivatives are topologically sorted, we know that the superDerivative is available
        superDerivative = this.derivedProperties.get(vDerivative.superDerivatives[i].ownPropertyName);
        derivative.superDerivatives.push(superDerivative);
        superDerivative.subDerivatives.push(derivative);
      }

      // 3.4 Assign the proxy state as the source of the derivative so that computations can pull out internal getters
      derivative.source = this.proxyState;

    }

  }

  addChangeReaction(property, handler) {

    if (this.observersOf.has(property)) {
      this.observersOf.get(property).push(handler);
    } else {
      this.observersOf.set(property, [handler]);
    }

    if (this.derivedProperties.has(property)) {
      const derivative = this.derivedProperties.get(property);
      derivative.observers.push(handler);
      setEndOfPropagationInBranchOf(derivative, TRAVERSE_DOWN);
    }

    // autorun the reaction
    REACTION_QUEUE.set(handler, this.proxyState[property]);
    react();

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

}

class StateExtensionInternals extends StateInternals {

  constructor(module, type) {
    super(module, type);
  }

  instanceDidMount(parent, ownPropertyName) {

    // ------------------INLINE "SUPER" CALL----------------------

    this.directParent = parent[__CUE__];
    this.ownPropertyName = ownPropertyName;

    let closestModuleParent = this.directParent;
    let branchPropertyName = ownPropertyName;
    while (closestModuleParent && closestModuleParent.type !== STATE_TYPE_MODULE) {
      branchPropertyName = closestModuleParent.ownPropertyName;
      closestModuleParent = closestModuleParent.closestModuleParent;
    }

    this.closestModuleParent = closestModuleParent; // the next upstream state object that is based on a module (can be the immediate parent!)
    this.branchPropertyName = branchPropertyName; // the property name of the enclosing object on the closest module parent

    // -------------------------------------------------------------

    this.internalGetters = ARRAY_MUTATOR_GETTERS;
    this.mounted = true;

  }

  propertyDidChange() {

    // 1. extension states have no observers, derivatives or consumers of their own
    // 2. regular bubble logic will apply
    this.bubble();

  }

}