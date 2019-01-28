
// Cue-State Prototype Object extends Cue-Prototype Object
CUE_LIB.state = oCreate(CUE_LIB.core, {

  import: {
    value: function(name) {
      const state = CUE_STATE_MODULES.get(name);
      if (!state) throw new ReferenceError(`Can't import State Module because nothing is registered under "${name}".`);
      return state;
    }
  }

});