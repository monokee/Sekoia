
// Public API: Cue.State [function]
defineProperty(Cue, 'State', {

  value: function (name, initialize) {

    if (CUE_STATE_MODULES.has(name)) {
      throw new Error(`A State Model has already been registered under name "${name}". Unregister it first or use a unique name.`);
    }

    CUE_STATE_MODULES.set(name, function Model(...rest) {

      if (!this.instance) {
        defineProperty(Model, 'instance', {
          value: defineProperties({}, {
            type: {value: CUE_STATE_TYPE_ID, enumerable: true},
            name: {value: name, enumerable: true},
            value: {value: undefined, enumerable: true, writable: true}
          })
        });
      }

      return this.instance.value || (this.instance.value = initialize(create(CUE_STATE_PROTO, {instance: Object.getOwnPropertyDescriptor(this, 'instance')}), ...rest));

    });

  }

});
