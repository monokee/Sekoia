
const CueInstanceProto = {

  mount(target = document.body, props = undefined) {

    if (this.mounted === true) {
      throw new Error('Cue instance already mounted.');
    }

    target = typeof target === 'string' ? document.querySelector(target) : target instanceof Element ? target : null;
    if (!target) throw new TypeError(`Target is not HTMLElement or Selector of element that is in the DOM.`);

    const rootState = STATE_MODULE.import(this.state.module);
    const rootComponent = UI_COMPONENT.import(this.ui.component);

    this.state.instance = rootState(props);
    this.ui.element = rootComponent(this.state.instance);

    target.appendChild(this.ui.element);

    this.mounted = true;

    return this;

  },

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

};