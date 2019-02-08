
/**
 * Creates a function that will run once when a module is first used.
 * It internally creates a StateFactory function for the module that will be called
 * on any subsequent requests. (Lazy instantiation of modules)
 * @function createStateFactoryInitializer
 * @param   {object}            module                  - The shared module object containing static module data (at this point it only contains the name).
 * @param   {(object|function)} initializer             - The second argument passed to public Cue.State function. Can be a config object or a function returning a config object.
 * @returns {function}          StateFactoryInitializer - The self-overwriting function which creates the factory function that will be called in place of itself on any subsequent instantiations of the module.
 * */

function createStateFactoryInitializer(module, initializer) {

  // A function that runs once to initialize itself, then overwrites itself with the factory function it creates for subsequent calls
  return props => {

    // 1. lazily initialize the core state module
    module = buildStateModule(module, initializer);

    // 2. build the inheritable prototype for state module
    const prototype = buildStateModulePrototype(module);

    // 3. create a state factory function
    const StateFactory = props => {
      // 3.1. Create an object by deep cloning default data that inherits from prototype.
      const data = oAssign(oCreate(prototype), deepClonePlainObject(module.defaults));
      // 3.2. Enhance the cloned data with reactive Cue Internals and return the PROXY STATE object.
      return createStateInstance(data, module, props).proxyState;
    };

    // 4. overwrite this initialization function with the StateFactory for subsequent calls
    CUE_STATE_MODULES.set(name, StateFactory);

    // 5. call the StateFactory and return the result
    return StateFactory.call(prototype, props);

  }
  
}