
function createComponentFactory(name, initializer) {

  let Component = null;
  let Internals = null;

  return state => {

    // lazily initialize the component
    if (Component === null) {
      Component = buildUIComponent(name, initializer);
      Internals = Component[__CUE__];
    }

    // create new UI Component Instance
    const instance = oCreate(Component);
    instance.element = Internals.template.cloneNode(true);
    instance.events = new Map();

    // 1. Initialize or NOOP
    Internals.initialize.call(instance, state);

    // 2. Render State
    if (instance.state && Internals.render) {

      for (const prop in Internals.render) {
        instance.state[__CUE__].addChangeReaction(prop, Internals.render[prop].bind(instance));
      }

    }

    // 3. Bind Events
    if (Internals.events.size > 0) {
      Internals.events.forEach((handlers, eventTypeToken) => {
        instance.element[eventTypeToken] = {
          scope: instance,
          handlers: handlers
        };
      });
    }

    // return dom element for compositing
    return instance.element;

  }

}