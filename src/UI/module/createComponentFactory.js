
function createComponentFactory(initializer) {

  let component = null;

  return state => {

    // lazily initialize the component
    component || (component = initializeUIComponent(initializer));

    // create new UI Component Instance
    const instance = new ComponentInstance(
      component.element.cloneNode(true),
      component.imports,
      component.styles
    );

    // 1. Initialize
    if (component.initialize) {
      component.initialize.call(instance, state);
    }

    // 2. Render State
    if (component.render) {
      installStateReactions(instance, component.render);
    }

    // 3. Bind Events
    if (component.events) {
      bindComponentEvents(instance, component.events);
    }

    // return dom element for compositing
    return instance.element;

  };

}