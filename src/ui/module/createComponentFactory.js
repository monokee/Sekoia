
function createComponentFactory(initializer) {

  let module = null;

  return state => {

    // lazily initialize the module
    module || (module = initializeUIModule(initializer));

    // create new UI Component Instance
    const component = new CueComponent(
      module.template.cloneNode(true),
      module.imports,
      module.styles,
      module.keyframes
    );

    // initialize
    if (module.initialize) {
      module.initialize.call(component, state);
    }

    // return dom element for compositing
    return component.element;

  };

}