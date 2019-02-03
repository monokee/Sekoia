
// Plugin Repository
const CUE_PLUGINS = new Map();

const PLUGIN_EXTENSION_POINTS = {
  core: LIB,
  state: STATE_MODULE,
  ui: UI_COMPONENT
};

// Internal Methods
const isPluginNameValid = name => typeof name === 'string' && name.length > 2 && name.indexOf('-') !== -1;

const parsePluginName = name => name.split('-');

const installPlugin = (plugin, options) => {

  if (plugin.didInstall) {
    return plugin.extensionPoint;
  }

  // Plugins can be extended by other plugins by declaring extension points via the return value from their install function:
  plugin.extensionPoint = plugin.installer.call(null, PLUGIN_EXTENSION_POINTS, options);
  plugin.didInstall = true;

  return plugin.extensionPoint;

};