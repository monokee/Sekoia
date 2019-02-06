
/**@external global - "this" context passed into the surrounding IIFE that the framework is embedded in. global === window in browser environment./

/**
 * The global Cue namespace. When called as a function it creates a composable Cue Composite by gluing a rootState to a rootUI.
 * @namespace {function}  Cue
 * @param     {object}    config - Configuration Object that specifies a "state" and a "ui" property. The values are names of State Module and UI Component to be instantiated at the root of the Cue instance.
 * @returns   {object}           - A Cue Composite instance that can be mounted to / unmounted from the live DOM or another Cue Composite.
 */
const Cue = global.Cue = config => new CueComposite(config);

Object.defineProperties(Cue, {

  on: {
    value: CUE_API.EventBus.on
  },

  once: {
    value: CUE_API.EventBus.once
  },

  off: {
    value: CUE_API.EventBus.off
  },

  trigger: {
    value: CUE_API.EventBus.trigger
  },

  Plugin: {
    value: CUE_API.Plugin.register
  },

  usePlugin: {
    value: CUE_API.Plugin.use
  },

  State: {
    value: CUE_API.State.register
  },

  isState: {
    value: CUE_API.State.isState
  },

  UI: {
    value: CUE_API.UI.register
  },

  isComponent: {
    value: CUE_API.UI.isComponent
  }

});