Cue.State('App', Module => {

  return function(props) {



  }

});

Cue.State('App', Module => ({

  model: {
    // internally: create proto object for computed methods
  },

  actions: {
    // conceptually tied to model but
    // operates on a data instance, not the static model
    // could also be a third top-level api Cue.Action
  },

  create(props) {
    // can validate props
    return Object.assign(Object.create(this.model), props);
  }

}));