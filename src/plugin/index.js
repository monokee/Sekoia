
// Plugin Repository
const CUE_PLUGINS = new Map();

// Plugins can compose functionality onto the following inner proto objects:
const CUE_PLUGIN_EXTENSION_POINTS = oFreeze({
  core: CUE_PROTO, // available in all modules
  state: CUE_STATE_PROTO, // available in state modules
  ui: CUE_UI_PROTO // available in ui modules
});

// Internal Methods
const isPluginNameValid = name => typeof name === 'string' && name.length > 2 && name.indexOf('-') !== -1;

const parsePluginName = name => name.split('-');

const installPlugin = (plugin, options) => {

  if (plugin.didInstall) {
    return plugin.extensionPoint;
  }

  // Plugins can be extended by other plugins by declaring extension points via the return value from their install function:
  plugin.extensionPoint = plugin.installer.call(null, CUE_PLUGIN_EXTENSION_POINTS, options);
  plugin.didInstall = true;

  return plugin.extensionPoint;

};