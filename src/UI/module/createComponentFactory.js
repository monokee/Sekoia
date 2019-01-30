
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

    // 1. Initialize
    if (component.initialize) {
      component.initialize.call(instance, state);
    }

    // 2. Render State
    if (component.renderState) {
      installStateReactions(instance, component.renderState);
    }

    // 3. Bind Events
    if (component.bindEvents) {
      bindComponentEvents(instance, component.bindEvents);
    }

    // return dom element for compositing
    return instance.element;

  };

}