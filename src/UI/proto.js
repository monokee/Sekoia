
// The CUE Proto Object (Inner-API) exposed to Cue.Component registration closures
// inherits methods and properties from main CUE_LIB.core object and thus has access to plugins and generic utilities
const CUE_LIB.ui = oCreate(CUE_LIB.core, {

  import: {
    value: function(name) {
      const component = CUE_UI_MODULES.get(name);
      if(!component) throw new ReferenceError(`Can't import UI Component because nothing is registered under "${name}".`);
      return component;
    }
  }

});