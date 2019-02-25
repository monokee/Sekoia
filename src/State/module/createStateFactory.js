
/**
 * Creates a function that will run once when a module is first used.
 * It internally creates a StateFactory function for the module that will be called
 * on any subsequent requests. (Lazy instantiation of modules)
 * @function createStateFactory
 * @param   {object}            _module                 - The shared module object containing static module data (at this point it only contains the name).
 * @param   {(object|function)} initializer             - The second argument passed to public Cue.State function. Can be a config object or a function returning a config object.
 * @returns {function}          StateFactoryInitializer - The self-overwriting function which creates the factory function that will be called in place of itself on any subsequent instantiations of the module.
 */

function createStateFactory(_module, initializer) {

  let initializedModule = null;

  const StateFactory = props => createState(
    deepClonePlainObject(initializedModule.defaults),
    initializedModule,
    STATE_TYPE_MODULE,
    props
  ).proxyState;

  return props => {
    initializedModule || (initializedModule = buildStateModule(_module, initializer));
    return StateFactory(props);
  }
  
}