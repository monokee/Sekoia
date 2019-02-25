
CUE_API.State = {

  register: (name, moduleInitializer) => {

    if (typeof name !== 'string') {
      throw new TypeError(`Can't create Cue State Module. First argument must be name of type string but is of type "${typeof name}".`);
    } else if (CUE_STATE_MODULES.has(name)) {
      throw new Error(`A State Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
    }

    const module = { name };
    CUE_STATE_INTERNALS.set(name, module);

    const StateFactory = createStateFactory(module, moduleInitializer);
    CUE_STATE_MODULES.set(name, StateFactory);

    return StateFactory;

  },

  isState: x => x && x[__CUE__]

};