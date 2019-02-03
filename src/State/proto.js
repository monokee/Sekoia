
/**
 * The namespace that is available as "Module" Object in state module registration closures. Contains helpers and plugins.
 * @namespace {object} STATE_MODULE
 * @extends   {object} LIB
 */
oAssign(STATE_MODULE, {

  /**
   * Import another state module that the current instance can extend itself with.
   * @method
   * @param   {string}    name  - The unique name of the Cue.State module to be imported.
   * @returns {function}  state - The factory function of the imported module.
   */
  import: name => {
    const state = CUE_STATE_MODULES.get(name);
    if (!state) throw new ReferenceError(`Can't import State Module because nothing is registered under "${name}".`);
    return state;
   },

  /**
   * Inject a property from a parent state into child state props.
   * @method
   * @param   {string} sourcePath                         - the path to the property on the module. ie "MyModule.SubModule.propA" where "MyModule.SubModule" is the module and "propA" the property to inject from that module.
   * @param   {object} [options = {readOnly: false}]      - optional options object that can indicate whether an injected property has both read-write (default) or read-only capabilities.
   * @returns {ProviderDescription}                              - Object describing the relationship between consumers and providers. Reused and enhanced throughout module instantiation cycle.
   */
  inject: (sourcePath, options = { readOnly: false }) => {
    const fragments = sourcePath.split('.');
    const providerModule = fragments.slice(0, -1).join('.');
    const providedProperty = fragments[fragments.length - 1];
    if (!CUE_STATE_MODULES.has(providerModule)) throw new ReferenceError(`Won't be able to inject "${providedProperty}" because State Module "${providerModule}" is undefined.`);
    return new ProviderDescription(providerModule, providedProperty, options.readOnly);
  }

});