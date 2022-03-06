import { Queue } from "../../store/internal/Queue.js";
import { renderList } from "../render-list.js";
import { StateProvider } from "./StateProvider.js";
import { ReactiveObject } from "../../store/ReactiveObject.js";

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

      const REFS = new Proxy({$self: this}, {
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
            this.state._internal_.setData(StateProvider.popState(this.getAttribute('composed-state-data')), false);
            this.removeAttribute('composed-state-data');
          }

        }

        // Register render callbacks
        for (const [key, callback] of MODEL.renderEvents) {
          // simple granular render functions: render({...$ref}, currentValue)
          this.state._internal_.observe(key, value => callback(REFS, value));
        }

        // Create automatic list renderings
        for (const [key, config] of MODEL.renderListConfigs) {

          const cfg = {
            parentElement: REFS[config.parentElement],
            createChild: config.createChild,
            updateChild: config.updateChild
          };

          const reactiveArray = this.state._internal_.getDatum(key);
          reactiveArray._internal_.setStructuralObserver(value => {
            renderList(value._internal_.nativeData, cfg);
          });

        }

      }

      if (MODEL.initialize) {
        // schedule as wildcard handler so that init is called after everything else
        Queue.wildcardEvents.set(MODEL.initialize.bind(this), REFS);
      }

    }

  }

}