
// The CUE Proto Object (Inner-API) exposed to Cue.Component registration closures
// inherits methods and properties from main CUE_PROTO object and thus has access to plugins and generic utilities
const CUE_UI_PROTO = create(CUE_PROTO, {

  import: {
    value: function(name) {
      const component = CUE_UI_MODULES.get(name);
      if(!component) throw new ReferenceError(`Can't import UI Component because nothing is registered under "${name}".`);
      return component;
    }
  }

});