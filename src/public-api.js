
/**@external global - "this" context passed into the surrounding IIFE that the framework is embedded in. global === window in browser environment.*/

/**
 * The global Cue namespace. When called as a function it creates a new Cue instance by gluing a rootState to a rootUI.
 * @namespace {function}  Cue
 * @param     {object}    config - Configuration Object that specifies a "state" and a "ui" property. The values are names of State Module and UI Component to be instantiated at the root of the Cue instance.
 * @returns   {object}           - A Cue Instance that can be mounted to / unmounted from the live DOM by calling instance.mount(targetDomElement, propsPassedToRootState) or instance.unmount() respectively.
 */
const Cue = global.Cue = config => {

  if (!isObjectLike(config))
    throw new TypeError('[Cue]: config is not an object.');
  if (typeof config.state !== 'string')
    throw new TypeError(`[Cue]: config.state is "${typeof config.state}" and not a name. Specify the name of a state module to use as the root state for the Cue instance.`);
  if (typeof config.ui !== 'string')
    throw new TypeError(`[Cue]: config.ui is "${typeof config.ui}" and not a name. Specify the name of a ui component to use as the root element for the Cue instance.`);

  return oAssign(oCreate(CueInstanceProto), {
    mounted: false,
    state  : {
      module  : config.state,
      instance: null
    },
    ui     : {
      component: config.ui,
      element  : null
    }
  });

};

/**
 * We're assigning the public APIs of the internal EventBus, Plugin, State and UI Modules to the global Cue namespace.
 * @namespace {function}  Cue
 * @property  {function}  (on, off, once, trigger)  - Global Cue Event Bus functions that can be used for cross-context communication (between Cue instances)
 * @property  {function}  Plugin                    - The Cue.Plugin registration function for defining new plugins.
 * @property  {function}  State                     - The Cue.State registration function for defining new reusable State Modules.
 * @property  {function}  UI                        - The Cue.UI registration function for defining new reusable UI Components.
 */
oAssign(Cue,
  CUE_EVENT_BUS_API,
  CUE_STATE_API,
  CUE_UI_API,
  CUE_PLUGINS_API
);

console.log(`%c🍑 Cue.js - Version ${_CUE_VERSION_}`, 'color: rgb(0, 140, 255)');
