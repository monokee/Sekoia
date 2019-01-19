
// Plugin Repository
const CUE_PLUGINS = new Map();

const CUE_PLUGIN_EXTENSION_POINTS = oFreeze({
  core: CUE_PROTO,
  state: CUE_STATE_PROTO,
  ui: CUE_UI_PROTO
});

// Internal Methods
const isPluginNameValid = name => typeof name === 'string' && name.length > 2 && name.indexOf('-') !== -1;

const parsePluginName = name => name.split('-');

const installPlugin = (plugin, options) => {

  if (plugin.didInstall) {
    return plugin.extensionPoint;
  }

  // the return value of the the plugin installer is the plugins extension point that can be extended by other plugins
  plugin.extensionPoint = plugin.installer.call(null, CUE_PLUGIN_EXTENSION_POINTS, options);
  plugin.didInstall = true;

  return plugin.extensionPoint;

};