
/**
 * Creates a function that will run once when a module is first used.
 * It internally creates a StateFactory function for the module that will be called
 * on any subsequent requests. (Lazy instantiation of modules)
 * @function createStateFactoryInitializer
 * @param   {string}            name                    - The unique name of the state module.
 * @param   {(object|function)} initializer             - The second argument passed to public Cue.State function. Can be a config object or a function returning a config object.
 * @returns {function}          StateFactoryInitializer - The self-overwriting function which creates the factory function that will be called in place of itself on any subsequent instantiations of the module.
 * */

function createStateFactoryInitializer(name, initializer) {

  return props => {

    const module = initializeStateModule(name, initializer);

    // Create a Factory Function that will be used to instantiate the module
    const StateFactory = createStateFactory(module);

    // Add module properties to StateFactory.prototype
    extendStateFactoryPrototype(StateFactory, module);

    // Overwrite this initialization function with the StateFactory for subsequent calls
    CUE_STATE_MODULES.set(name, StateFactory);

    // Call the StateFactory and return the result
    return StateFactory.call(null, props);

  }
  
}