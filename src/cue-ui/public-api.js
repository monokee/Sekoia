
// # Public API: Cue.Component [function]

defineProperty(Cue, 'Component', {

  value: function (name, config) {

    // Component Registration function

    if (typeof name !== 'string') {
      throw new TypeError(`Can't create Cue-Component. First argument must be name of type string but is of type "${typeof name}".`);
    } else if (typeof config !== 'function') {
      throw new TypeError(`Can't create Cue-Component. Second argument must be module of type function but is of type "${typeof config}".`);
    } else if (CUE_UI_MODULES.has(name)) {
      throw new Error(`A UI Component has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
    }

    let module = null;

    CUE_UI_MODULES.set(name, function ComponentConstructor(state) {

      module || (module = setupModule(config));
      const element = module.template.cloneNode(true);
      module.initialize && module.initialize.call(new UI(element, module.components, module.styles, module.keyframes), state);
      return element;

    });

  }

});

// # Private Registration Utils:

function setupModule(config) {

  const module = config(CUE_UI_PROTO);

  if (!module || module.constructor !== Object) {
    throw new TypeError(`Can't create Component Module because the configuration function does not return a plain object.`);
  }

  if (!module.template || !module.template.element) {
    throw new TypeError(`Component Module requires "template" object that specifies an "element" like: "template.element === DOMString || DOMNode || DOMSelector".`);
  }

  // create template element
  const template = createTemplateRootElement(module.template.element);

  // Note: we're flattening the module object hierarchy by lifting styles, keyframes and components from module.template directly to module:

  // create css rules, swap classNames with component-scoped names on template element
  if (module.template.styles) {
    module.styles = scopeStylesToComponent(module.template.styles, template);
  }

  // create css keyframes and swap keyframe names with component-scoped names
  if (module.template.keyframes) {
    module.keyframes = scopeKeyframesToComponent(module.template.keyframes);
  }

  if (module.template.components) {
    module.components = module.template.components;
  }

  // reassign template so that it directly refers to the actual template Node
  module.template = template;

  // Module Lifecycle Methods default to NOOP
  //module.initialize || (module.initialize = NOOP);
  module.didMount || (module.didMount = NOOP);
  module.didUpdate || (module.didUpdate = NOOP);
  module.willUnmount || (module.willUnmount = NOOP);

  // return module object of shape: {template: DOMNode, lifecycleMethods: ...functions, [styles: nameMap, keyframes: nameMap, components: object]}
  return module;

}

function createTemplateRootElement(x) {

  if (typeof x === 'string') {

    x = x.trim();

    switch (x[0]) {
      case '<': return document.createRange().createContextualFragment(x).firstChild;
      case '.': return document.getElementsByClassName(x.substring(1))[0];
      case '#': return document.getElementById(x.substring(1));
      case '[': return document.querySelectorAll(x)[0];
      default:  return document.createTextNode(x);
    }

  } else if (x instanceof Element) {

    return x;

  }

}




// EXAMPLE:

/*

Cue.Component('CountryView', Module => ({

  template: { // required

    element: (
      `<div class="countryView">
        <h2 class="heading"></h2>
        <div class="list"></div>
      </div>`
    ),

    components: {
      countryThumbnail: Module.import('CountryThumbnail'),
      countryInfoBox: Module.import('CountryInfoBox')
    },

    styles: {
      countryView: {
        display: 'flex',
        ':before': {
          content: '::'
        }
      }
    },

    keyframes: {
      bounceUp: {
        0: {
          top: '0px',
          marginBottom: '12px'
        },
        100: {
          top: '25px',
          marginBottom: '36px'
        }
      }
    }

  },

  initialize(model) { // required

    const {element, classList} = this;
    const {countryList, heading, main} = this.refs();
    const {Thumbnail, InfoBox} = this.components;

    // REACTION RENDERING

    this.observe(model, {

      name: o => {
        element.textContent = o.value;
      },

      countries: o => {
        this.setChildren({from: o.oldValue, to: o.newValue, create: Thumbnail});
      }

    });

    // USER EVENTS

    this.on({

      click: e => model.counter++,

      contextmenu: e => {

        if (e.target === countryList) {
          this.classList.toggle('countryView');
        } else {
          model.title = 'Not clicked on target!';
        }

      },

      keydown: Cue.throttle(e => {

        if (e.shiftKey) {

        }

      }, 250)

    });

  },

  didMount() {},

  didUpdate() {},

  willUnmount() {}

}));

 */