
class CueComposite {

  constructor(config) {

    if (!isObjectLike(config)) throw new TypeError('[Cue]: config is not an object.');

    this.state = {
      module: config.state,
      instance: null
    };

    this.ui = {
      component: config.ui,
      element: null
    };

    this.mounted = false;

  }

  mount(target, props = undefined) {

    if (this.mounted === true) throw new Error('Cue instance already mounted.');

    if (typeof this.state.module === 'string') {
      this.state.module = STATE_MODULE.import(this.state.module);
    } else if (typeof this.state.module === 'function' || typeof this.state.module === 'object') {
      const uniqueModuleName = createUID('cue_module');
      CUE_API.State.register(uniqueModuleName, this.state.module);
      this.state.module = STATE_MODULE.import(uniqueModuleName);
    }

    if (typeof this.ui.component === 'string') {
      this.ui.component = UI_COMPONENT.import(this.ui.component);
    } else if (typeof this.ui.component === 'function' || typeof this.ui.component === 'object') {
      const uniqueComponentName = createUID('cue_component');
      CUE_API.UI.register(uniqueComponentName, this.ui.component);
      this.ui.component = UI_COMPONENT.import(uniqueComponentName);
    }

    target = typeof target === 'string' ? document.querySelector(target) : target instanceof Element ? target : undefined;
    
    if (!target) throw new TypeError(`Target must be a valid DOM Element or DOM Selector String.`);

    // instantiate
    this.state.instance = this.state.module(props);
    this.ui.element = this.ui.component(this.state.instance);

    //TODO: now, where do I attach the state? I could attach it to an arbitrary root store. does this superstate have to be persisted structurally? can props be injected into the superstate?
    // if so, we have to return the unique id of the state if it has been automatically created so that it can be referenced somehow. Think about this. Draw it out. Write the code how you would
    // ideally want to write it. Think in Legos.

    target.appendChild(this.ui.element);

    this.mounted = true;

    return this;

  }

  unmount() {

    if (this.mounted === false) {
      throw new Error(`Can't unmount Cue instance because it has not been mounted.`);
    }

    this.ui.element.parentElement.removeChild(this.ui.element);

    this.ui.element = null;
    this.state.instance = null;

    this.mounted = false;

    return this;

  }

}