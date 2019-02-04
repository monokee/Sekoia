
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

  return props => {

    // lazily initialize the core module the first time an instance is created from it.
    initializeStateModule(module, initializer);

    // Create a Factory Function that will be used to instantiate the module
    const StateFactory = createStateFactory(module);

    // Overwrite this initialization function with the StateFactory for subsequent calls
    CUE_STATE_MODULES.set(name, StateFactory);

    // Call the StateFactory and return the result
    return StateFactory.call(null, props);

  }
  
}