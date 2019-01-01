

// Plugin Repository
const CUE_PLUGINS = new Map();

// Internal Methods
const isPluginNameValid = name => typeof name === 'string' && name.length > 2 && name.indexOf('-') !== -1;

const parsePluginName = name => name.split('-');

const installPlugin = (plugin, options) => {

  if (plugin.didInstall) {
    console.warn(`"${plugin.name}" has already been installed. Installation ignored.`);
    return plugin.interface;
  }

  plugin.installer.call(plugin.interface, CUE_PROTO, options);
  plugin.didInstall = true;
  plugin.interface.onDidInstall();

  return plugin.interface;

};