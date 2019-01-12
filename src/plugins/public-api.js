
// Public Plugin API
OBJ.defineProperties(Cue, {

  Plugin: {

    value: function (name, installer, autoinstall) {

      if (!isPluginNameValid(name)) {
        throw new Error(`Plugin must be defined with a namespaced-name (vendor-plugin) of type string as the first argument.`);
      }

      // split name into vendor, plugin
      const [vendor, plugin] = parsePluginName(name);

      if (!installer && !autoinstall) { // return plugin interface when only name is provided (like getter)

        const byVendor = CUE_PLUGINS.get(vendor);

        if (byVendor) {

          const thePlugin = byVendor.get(plugin);

          if (thePlugin) {
            return thePlugin;
          }

        }

      } else { // register a new plugin when all arguments are provided (like setter)

        if (typeof installer !== 'function') {
          throw new Error(`Plugin must be defined with an installable function as the second argument.`);
        }

        const byVendor = CUE_PLUGINS.get(vendor) || CUE_PLUGINS.set(vendor, new Map()).get(vendor);

        if (byVendor.has(plugin)) {
          console.warn(`A plugin with name "${plugin}" has already been registered under "${vendor}". Skipping installation...`);
          return byVendor.get(plugin).interface;
        }

        const thePlugin = {
          installer: installer,
          didInstall: false,
          name: name,
          interface: {
            name: name,
            onDidInstall() {}
          }
        };

        byVendor.set(plugin, thePlugin);

        return autoinstall ? installPlugin(thePlugin) : thePlugin.interface;

      }

    }

  },

  use: {

    value: function (pluginName, options) {

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

      throw new Error(`No Plugin registered under "${pluginName}".`);

    }

  }

});