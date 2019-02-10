
class CueComposite {

  constructor(config) {

    if (!isObjectLike(config)) throw new TypeError('Cue config must be an object.');

    this.stateModule = config.state;
    this.stateInstance = null;
    this.stateInternals = null;

    this.uiComponent = config.ui;
    this.uiElement = null;

    this.mounted = false;

  }

  mount(target, props = undefined) {

    if (this.mounted === true) throw new Error('Cue instance already mounted.');

    // Assign / Register the State Module
    let stateModuleName;
    if (typeof this.stateModule === 'string') {
      stateModuleName = this.stateModule;
    } else if (typeof this.stateModule === 'function' || typeof this.stateModule === 'object') {
      stateModuleName = createUID('cue_module');
      CUE_API.State.register(stateModuleName, this.stateModule);
    }

    // Assign / Register the UI Component
    let uiComponentName;
    if (typeof this.uiComponent === 'string') {
      uiComponentName = this.uiComponent;
    } else if (typeof this.uiComponent === 'function' || typeof this.uiComponent === 'object') {
      uiComponentName = createUID('cue_component');
      CUE_API.UI.register(uiComponentName, this.uiComponent);
    }

    const stateFactory = STATE_MODULE.import(stateModuleName);
    const uiFactory = UI_COMPONENT.import(uiComponentName);

    // Parse the Target UI Element
    target = typeof target === 'string' ? document.querySelector(target) : target instanceof Element ? target : undefined;
    if (!target) throw new TypeError(`Target must be a valid DOM Element or DOM Selector String.`);

    // Create State Instance (this returns a proxy)
    const stateInstance = this.stateInstance = stateFactory(props);
    const stateInternals = this.stateInternals = stateInstance[__CUE__];
    stateInternals.instanceDidMount.call(stateInternals, CUE_ROOT_STATE, stateModuleName);

    // Create UI Element and append it to the target
    const uiElement = this.uiElement = uiFactory(stateInstance);
    target.appendChild(uiElement);

    this.mounted = true;

    return this;

  }

  unmount() {

    if (this.mounted === false) {
      throw new Error(`Can't unmount Cue instance because it has not been mounted.`);
    }

    this.uiElement.parentElement.removeChild(this.uiElement);

    this.uiElement = null;
    this.stateInstance = null;
    this.stateInternals = null;

    this.mounted = false;

    return this;

  }

  getState(asJSON) {
    if (!this.stateInstance) {
      throw new ReferenceError(`State can't be "${typeof this.stateInstance}" when getting it. Mount the Cue Instance first.`);
    } else {
      return this.stateInternals.proxyState['get'](asJSON);
    }
  }

  setState(props) {
    if (!this.stateInstance) {
      throw new ReferenceError(`State can't be "${typeof this.stateInstance}" when setting it. Mount the Cue Instance first.`);
    } else {
      this.stateInternals.proxyState['set'](props);
    }

    return this;

  }

}