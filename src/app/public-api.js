
let appRegistered = false;

OBJ.defineProperty(Cue, 'App', {

  value: function(initialize) {

    if (appRegistered) {
      throw new Error(`An App has already been registered. You can only run a single Cue App per context.`);
    }

    appRegistered = true;

    initialize(CUE_APP_PROTO);

  }

});