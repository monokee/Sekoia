
const CUE_PLUGINS_API = {

  Plugin: (name, installer, autoinstall) => {

    if (!isPluginNameValid(name)) {
      throw new Error(`Plugin must be defined with a namespaced-name (vendor-plugin) of type string as the first argument.`);
    }

    // split name into vendor, plugin
    const [vendor, plugin] = parsePluginName(name);

    if (!installer && !autoinstall) { // return plugin interface when only name is provided (Handle Plugin() call like getter)

      const byVendor = CUE_PLUGINS.get(vendor);

      if (byVendor) {

        const thePlugin = byVendor.get(plugin);

        if (thePlugin) {
          return thePlugin;
        } else {
          throw new Error(`No Plugin with name ${name} has been registered under "${vendor}".`);
        }

      } else {
        throw new Error(`No Plugin has been registered under "${byVendor}".`);
      }

    } else { // register a new plugin when all arguments are provided (like setter)

      if (typeof installer !== 'function') {
        throw new Error(`Plugin must be defined with an installable function as the second argument.`);
      }

      const byVendor = CUE_PLUGINS.get(vendor) || CUE_PLUGINS.set(vendor, new Map()).get(vendor);

      if (byVendor.has(plugin)) {
        console.warn(`A plugin with name "${plugin}" has already been registered under "${vendor}". Skipping installation...`);
        return byVendor.get(plugin).name;
      }

      const thePlugin = {
        installer : installer,
        didInstall: false,
        name      : name,
        extensionPoint : undefined
      };

      byVendor.set(plugin, thePlugin);

      if (autoinstall) {
        installPlugin(thePlugin);
      }

      // Return just the name token to store it in constants and pass it around the system.
      return name;

    }

  },

  use: (pluginName, options) => {

    if (!isPluginNameValid(pluginName)) {
      throw new Error(`pluginName must be a namespaced-string (vendor-plugin).`);
    }

    const [vendor, plugin] = parsePluginName(pluginName);

    const byVendor = CUE_PLUGINS.get(vendor);

    if (byVendor) {

      const thePlugin = byVendor.get(plugin);

      if (thePlugin) {
        return installPlugin(thePlugin, options);
      }

    }

    throw new Error(`No Plugin has been registered under "${pluginName}".`);

  }

};