
function createComponentFactory(initializer) {

  let component = null;

  return state => {

    // lazily initialize the component
    component || (component = initializeUIComponent(initializer));

    // create new UI Component Instance
    const instance = new ComponentInstance(
      component.template.cloneNode(true),
      component.imports,
      component.styles,
      component.keyframes
    );

    // initialize
    if (component.initialize) {
      component.initialize.call(instance, state);
    }

    // return dom element for compositing
    return instance.element;

  };

}