Cue.State('App', Module => ({

  model: {
    some: 'static data',
    a({computed, property}) {
      return `${computed} by destructuring the required ${property}`;
    }
  },

  components: {
    stuff: 'toImport...'
  },

  actions: {
    doSomething(payload) {
      if (this.a === undefined) {
        this.some = 'something else.'
      } else {
        this.totallyNew = [];
        this.totallyNew.push(payload);
      }
    }
  },

  factory(model, props) {
    // model === default data values + computed properties (on shared prototype).
    // can validate props here...
    // we can return the static data or a new copy of it.
    return Object.assign(Object.create(this.model), props);
  }

}));