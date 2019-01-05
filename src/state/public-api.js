
// Public API: Cue.State [function]
defineProperty(Cue, 'State', {
  value: function(name, moduleInitializer) {

    if (typeof name !== 'string') {
      throw new TypeError(`Can't create Cue State Module. First argument must be name of type string but is of type "${typeof name}".`);
    } else if (CUE_STATE_MODULES.has(name)) {
      throw new Error(`A State Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
    }

    const StateFactoryInitializer = createStateFactoryInitializer(name, moduleInitializer);

    CUE_STATE_MODULES.set(name, StateFactoryInitializer);

    return StateFactoryInitializer;

  }
});
