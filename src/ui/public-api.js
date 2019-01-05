
defineProperty(Cue, 'UI', {

  value: function (name, moduleInitializer) {

    if (typeof name !== 'string') {
      throw new TypeError(`Can't create Cue-UI Module. First argument must be name of type string but is of type "${typeof name}".`);
    } else if (!moduleInitializer || (typeof moduleInitializer !== 'function' && moduleInitializer.constructor !== Object)) {
      throw new TypeError(`Can't create Cue-UI Module. Second argument must be module initializer function or configuration object but is of type "${typeof moduleInitializer}".`);
    } else if (CUE_UI_MODULES.has(name)) {
      throw new Error(`A UI Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
    }

    const ComponentFactory = createComponentFactory(moduleInitializer);

    CUE_UI_MODULES.set(name, ComponentFactory);

    return ComponentFactory;

  }

});