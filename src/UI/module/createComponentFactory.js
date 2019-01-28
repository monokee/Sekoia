
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

    // how can we make the "instance" available to the static "Component" Object (lib-ui, extends lib-core)?
    // Component is shared by all instances. Calling Component.hasContent() without a parameter should default to instance.element as the default component.

    // initialize
    if (component.initialize) {
      component.initialize.call(instance, state);
    }

    // return dom element for compositing
    return instance.element;

  };

}