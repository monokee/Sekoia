
/**
 * Attaches itself to a reactive state instance under private [__CUE__] symbol.
 * Properties and methods are required for reactivity engine embedded into every Cue State Instance
 */
class StateInternals {

  constructor(module, type) {

    // faster instanceof check
    this[__IS_STATE_INTERNAL__] = true;

    // STATE_TYPE_INSTANCE = 1 or STATE_TYPE_EXTENSION = 2
    this.type = type;

    // value cache used for change detection
    this.valueCache = new Map(); // 1D map [propertyName -> currentValue]

    // Shortcut pointers to underlying module (shared by all instances of module)
    this.module = module;
    this.name = module.name;
    this.consumersOf = module.consumersOf; // 2D map [propertyName -> [...ConsumerDescriptions]] ConsumerDescription = {targetModule: nameOfTargetModule, targetProperty: nameOfPropertyAsDefinedOnChild}

    // Will be assigned after construction
    this.plainState = null; // the plain data object that these internals are attached to
    this.proxyState = null; // the same data object but wrapped in a reactive proxy
    this.parentInternals = null; // the [__CUE__] internals of the parent of the plain state data in the object node graph
    this.ownPropertyName = ''; // the name of this instance on the parent node graph
    this.initialProps = undefined; // when a factory function that created the state instance got passed any props, we store them here temporarily so that the props can later be passed up to the public initialize method.

  }

  retrieveState(asJSON) {
    const clone = isArray(this.plainState) ? deepCloneArray(this.plainState) : deepClonePlainObject(this.plainState);
    return asJSON ? JSON.stringify(clone) : clone;
  }

  applyState(props) {

    // For batch-applying data collections from immutable sources.
    // Internally reconciles the passed props with the existing state tree and only mutates the deltas.
    // Immediate reactions of the mutated properties are collected on an accumulation stack.
    // Only after the batch operation has finished, the accumulated reactions queue their dependencies and we react in a single flush.
    //TODO: defer all recursive lookups involving provided properties (upstream/downstream) until after applyState is done reconciling.
    // OR BETTER YET: completely work around any proxy interception for batch updates. create a specific set method that is called DIRECTLY from patchState
    // that collects only unique immediate dependencies on an accumulation stack. after patchState has run, we explicitly cue up the dependencies of the accumulated dependencies (including setters to provided states)
    // and only then react to the collective change in a single batch. This will be insanely performant because every change will only be evaluated and reacted to once. This is huge!
    // THIS has the other advantage that I can also reduce the cue and react logic because we no longer have to check for accumulations as this is explicitly outsourced to a special callback.

    if (props.constructor === String) {
      props = JSON.parse(props);
    }

    isAccumulating = true;
    patchState(this.parentInternals.proxyState, this.ownPropertyName, props);
    isAccumulating = false;
    cueAccumulated();
    react();

  }

  addChangeReaction(property, handler, scope, autorun = true) {

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
      const val = this.plainState[property];
      boundHandler({value: val, path: this.pathFromRootAsString}); // TODO: should we pass the path like this?
    }

    return boundHandler;

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

  instanceDidMount(parent, ownPropertyName) {

    // find the nearest parent that is based on a module and build the path to the property
    let rootInternals = parent[__CUE__];
    let rootPropertyName = ownPropertyName;
    let pathFromRoot = [ rootPropertyName ];

    while (rootInternals && rootInternals.type !== STATE_TYPE_INSTANCE) {
      rootInternals = rootInternals.rootInternals;
      rootPropertyName = rootInternals.rootPropertyName;
      pathFromRoot.unshift(rootPropertyName);
    }

    this.rootInternals = rootInternals || CUE_ROOT_STATE;
    this.rootPropertyName = rootPropertyName;
    this.pathFromRoot = pathFromRoot;
    this.pathFromRootAsString = pathFromRoot.join('.');

    // only "smart" state instances based on their own module have top-level observers, derivatives and providers.
    // all non-module-based state extensions (objects and arrays written into the state of a module) pull in smart data from their nearest module-based parent.
    if (this.type === STATE_TYPE_INSTANCE) {

      this.observersOf = new Map();       // 1D map [propertyName -> handler]
      this.derivativesOf = new Map();     // 2D map [propertyName -> 1D array[...Derivatives]]
      this.derivedProperties = new Map(); // 1D map [propertyName -> Derivative]
      this.providersOf = new Map();       // 1D map [ownPropertyName -> provider{sourceInstance: instance of this very class on an ancestor state, sourceProperty: name of prop on source}]

      // 2. Inject Providers
      if (this.module.providersToInstall.size > 0) {
        this.injectProviders();
      }

      // 3. Create Derivatives from module blueprints
      if (this.module.computed.size > 0) {
        this.installDerivatives();
      }

      // 4. Initialize instance with ProxyState as "this" and pass initialProps we originally received from factory
      this.module.initialize.call(this.proxyState, this.initialProps);

      // 5. We no longer need initialProps
      delete this.initialProps;

    }

  }

  instanceWillUnmount() {
    console.log('[todo: instanceWillUnmount]', this);
  }

  injectProviders() {

    let description, sourceModule, sourceProperty, targetModule, targetProperty;
    for (description of this.module.providersToInstall.values()) {

      // only install providers onto children when they are allowed to mutate the providing parent state
      if (description.readOnly === false) {

        sourceModule = description.sourceModule;
        sourceProperty = description.sourceProperty;   // should only ever be a top-level property name on a module-based state instance.
        targetModule = description.targetModule;      // guaranteed to be the name of a module.
        targetProperty = description.targetProperty; // guaranteed to be a top-level property name on a module-based state instance.

        // Traverse through the parent hierarchy until we find the first parent that has been created from a module that matches the name of the providerModule
        let rootInternals = this.rootInternals;

        while (rootInternals && rootInternals.type !== STATE_TYPE_INSTANCE && rootInternals.name !== sourceModule) {
          rootInternals = rootInternals.rootInternals;
        }

        if (rootInternals) { // found a parent instance that matches the consuming child module name

          // -> inject the provider!
          // we have previously installed forwarding accessors on the prototype that will reach into the map on this instance:
          this.providersOf.set(targetProperty, {sourceInstance: rootInternals, sourceProperty, targetModule, targetProperty});

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

      // 3.0 Create Derivative instance
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
      // (plainState inherits from module.prototype which contains forwarding-getters which trigger value computation in Derivative)
      derivative.fillCache(this.plainState);

    }

  }

  propertyDidChange(prop, value) {

    // if im an extensionState and one of my properties has changed, i will forward the change to my nearest module parent which will receive a change event for a property that i am attached to. a path will be available in the event handler.
    // if im an instanceState, i will only notify my immediate property observers.

    if (this.type === STATE_TYPE_EXTENSION) { // forward all changes to the nearest root parent

      const root = this.rootInternals;
      const rootProp = this.rootPropertyName;
      const rootVal = root.plainState[rootProp];
      const path = this.pathFromRootAsString + '.' + prop;

      const observers = root.observersOf.get(rootProp);
      const derivatives = root.derivativesOf.get(rootProp);

      // 1. recurse over direct dependencies
      if (observers || derivatives) {
        if (isAccumulating) {
          cueImmediate(rootProp, rootVal, path, observers, derivatives, false);
        } else {
          cueAll(rootProp, rootVal, path, observers, derivatives, false);
        }
      }

      const consumers = root.consumersOf.get(rootProp);

      if (consumers) {
        root.cueConsumers.call(root, root, consumers, rootProp, rootVal, path);
      }

    } else if (this.type === STATE_TYPE_INSTANCE) { // react on self

      const observers = this.observersOf.get(prop);
      const derivatives = this.derivativesOf.get(prop);

      if (observers || derivatives) {
        if (isAccumulating) {
          cueImmediate(prop, value, prop, observers, derivatives, false);
        } else {
          cueAll(prop, value, prop, observers, derivatives, false);
        }
      }

      const consumers = this.consumersOf.get(prop);

      // 2. if the changed property has consumers, find them and recurse
      if (consumers) {
        this.cueConsumers(this, consumers, prop, value, prop);
      }

    }

  }

  cueConsumers(providerInstance, consumers, prop, value) {

    // Find consumer instances and recurse into each branch

    let key, childState;
    for (key in this.plainState) { // TODO: this will loop over prototype.

      childState = this.plainState[key];

      if (childState && (childState = childState[__CUE__])) { // property is a child state instance

        let provider;
        for (provider of childState.providersOf.values()) {
          if (provider.sourceInstance === providerInstance && provider.sourceProperty === prop) {
            // this will branch off into its own search from a new root for a new property in case the provided property is passed down at multiple levels in the state tree...
            childState.propertyDidChange.call(childState, provider.targetProperty, value); // continue recursion in this branch
          }
        }

        // even if we did find a match above we have to recurse, potentially creating a parallel search route (if the provided prop is also provided from another upstream state)
        childState.cueConsumers.call(childState, providerInstance, consumers, prop, value);

      }

    }

  }

}