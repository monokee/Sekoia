
global || (global = window);
const Cue = global.Cue = oAssign(function(config) {

    if (!config || config.constructor !== OBJ)
      throw new TypeError('[Cue]: config is not an object.');
    if (typeof config.state !== 'string')
      throw new TypeError(`[Cue]: config.state is "${typeof config.state}" and not a name. Specify the name of a state module to use as the root state for the Cue instance.`);
    if (typeof config.ui !== 'string')
      throw new TypeError(`[Cue]: config.ui is "${typeof config.ui}" and not a name. Specify the name of a ui component to use as the root element for the Cue instance.`);

    return oAssign(oCreate(CueInstanceProto), {
      state: {
        module: config.state,
        instance: null
      },
      ui: {
        component: config.ui,
        element: null
      },
      mounted: false,
      lifeCycle: {
        didMount: config.didMount || NOOP,
        willUnmount: config.willUnmount || NOOP,
      }
    });

  },

  CUE_PLUGINS_API,
  CUE_STATE_API,
  CUE_UI_API

);

console.log(`%c🍑 Cue.js - Version ${_CUE_VERSION_}`, 'color: rgb(0, 140, 255)');
