
/**
 * Public API for Cue.State
 * @namespace CUE_STATE_API
 */
const CUE_STATE_API = {

  /**
   * Registers a new State Module under the specified name.
   * @function
   * @memberOf CUE_STATE_API
   * @param {string}            name              - The unique name for the state module to be registered.
   * @param {(object|function)} moduleInitializer - Can be a config object or a function returning a config object
   */
  State: (name, moduleInitializer) => {

    if (typeof name !== 'string') {
      throw new TypeError(`Can't create Cue State Module. First argument must be name of type string but is of type "${typeof name}".`);
    } else if (CUE_STATE_MODULES.has(name)) {
      throw new Error(`A State Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
    }

    CUE_STATE_MODULES.set(name, createStateFactoryInitializer(name, moduleInitializer));

  }

};

/**
 * Check if a value is a Cue.State instance.
 * @function isState
 * @memberOf CUE_STATE_API.State
 * @param     {*} x       - Any value that should be evaluated.
 * @returns   {boolean}   - True if value is a Cue.State instance, false if not.
 */
CUE_STATE_API.State.isState = x => x && x[__CUE__];