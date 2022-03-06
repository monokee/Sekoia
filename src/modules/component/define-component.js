import { ComponentModel } from "./internal/ComponentModel.js";
import { ComponentElement } from "./internal/ComponentElement.js";
import { ReactiveObject } from "../store/ReactiveObject.js";

export function defineComponent(name, config) {

  const model = new ComponentModel(name, config);

  const component = class extends ComponentElement {
    constructor() {
      super(model);
    }
  };

  // add custom methods to prototype
  for (const key in config) {
    if (config.hasOwnProperty(key) && key !== 'initialize' && typeof config[key] === 'function') {
      component.prototype[key] = config[key];
    }
  }

  window.customElements.define(name, component);

  // creates composable html tag with attributes
  const Factory = attributes => ComponentModel.createTag(name, attributes);

  // creates a new state object
  Factory.state = data => {
    if (model.setupStateOnce()) {
      return ReactiveObject._from_(model.state, data);
    } else {
      return data;
    }
  };

  // creates dom node
  Factory.render = attributes => ComponentModel.createNode(name, attributes, Factory.state);

  return Factory;

}