
// The helper object available to public component registration closure as "Component".
// inherits methods and properties from main LIB object and thus has access to plugins and generic utilities
oAssign(UI_COMPONENT, {

  import: name => {
    const component = CUE_UI_MODULES.get(name);
    if(!component) throw new ReferenceError(`Can't import UI Component because nothing is registered under "${name}".`);
    return component;
  }

});