
function createComponentFactory(name, initializer) {

  let Component = null;
  let Internals = null;

  return state => {

    // lazily initialize the component
    Component || ((Component = buildUIComponent(name, initializer)) && (Internals = Component[__CUE__]));

    // create new UI Component Instance
    const instance = oCreate(Component);
    instance.element = Internals.template.cloneNode(true);
    instance.events = new Map();

    // 1. Initialize or NOOP
    Internals.initialize.call(instance, state);

    // 2. Render State
    if (Internals.render) {
      installStateReactions(instance, Internals.render);
    }

    // 3. Bind Events
    if (Internals.events) {
      bindComponentEvents(instance, Internals.events);
    }

    // return dom element for compositing
    return instance.element;

  };

}