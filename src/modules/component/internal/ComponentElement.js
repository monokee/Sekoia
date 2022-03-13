import { Queue } from "../../state/internal/Queue.js";
import { renderList } from "../render-list.js";
import { StateProvider } from "./StateProvider.js";
import { ReactiveObject } from "../../state/ReactiveObject.js";

export class ComponentElement extends HTMLElement {

  constructor(model) {

    super();

    Object.defineProperties(this, {
      _initialized_: {
        value: false,
        writable: true
      },
      _model_: {
        value: model
      }
    });

  }

  connectedCallback() {

    if (this._initialized_ === false) {

      this._initialized_ = true;

      const MODEL = this._model_;

      const REFS = this.refs = new Proxy({$self: this}, {
        get: (target, key) => {
          return target[key] || (target[key] = this.getElementsByClassName(MODEL.refs.get(key))[0]);
        }
      });

      // compile template
      MODEL.compileTemplateOnce();

      // create inner component markup
      this.appendChild(MODEL.content.cloneNode(true));

      if (MODEL.setupStateOnce()) {

        if (this.hasAttribute('provided-state')) {

          this.state = StateProvider.popState(this.getAttribute('provided-state'));
          this.removeAttribute('provided-state');

        } else {

          this.state = this.state || ReactiveObject._from_(MODEL.state);

          if (this.hasAttribute('composed-state-data')) {
            this.state.$$.setData(StateProvider.popState(this.getAttribute('composed-state-data')), false);
            this.removeAttribute('composed-state-data');
          }

        }

        // Register render callbacks
        for (const [key, callback] of MODEL.renderEvents) {
          // simple granular render functions: render({...$ref}, currentValue)
          this.state.$$.observe(key, value => callback(REFS, value));
        }

        // Create automatic list renderings
        for (const [key, config] of MODEL.renderListConfigs) {

          const cfg = {
            parentElement: REFS[config.parentElement],
            createChild: config.createChild,
            updateChild: config.updateChild
          };

          const reactiveArray = this.state.$$.getDatum(key);
          reactiveArray.$$.setStructuralObserver(value => {
            renderList(value, cfg);
          });

        }

      }

      if (MODEL.initialize) {
        // schedule as wildcard handler so that init is called after everything else
        Queue.wildcardEvents.set(MODEL.initialize.bind(this), REFS);
      }

    }

  }

  cloneNode(withState = false) {

    if (withState && !this._initialized_) {
      throw new Error('Cannot clone component with state before initialization.');
    }

    const instance = document.createElement(this.tagName);

    // copy top level attributes
    for (let i = 0, attribute; i < this.attributes.length; i++) {
      attribute = this.attributes[i];
      instance.setAttribute(attribute.nodeName, attribute.nodeValue);
    }

    // copy state if required
    withState && this.state && instance.setAttribute(
      'composed-state-data',
      StateProvider.setState(this.state.snapshot())
    );

    return instance;

  }

}