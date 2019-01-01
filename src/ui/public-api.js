
// # Public API: Cue.Component [function]

defineProperty(Cue, 'UI', {
  value: registerUIModule
});

function registerUIModule(name, moduleInitializer) {

  if (typeof name !== 'string') {
    throw new TypeError(`Can't create Cue-UI Module. First argument must be name of type string but is of type "${typeof name}".`);
  } else if (!moduleInitializer || (typeof moduleInitializer !== 'function' && moduleInitializer.constructor !== Object)) {
    throw new TypeError(`Can't create Cue-UI Module. Second argument must be module initializer function or configuration object but is of type "${typeof moduleInitializer}".`);
  } else if (CUE_UI_MODULES.has(name)) {
    throw new Error(`A UI Module has already been registered under name "${name}". Unregister, use a unique name or consider namespacing.with.dots-or-hyphens...`);
  }

  let module = null;

  const ComponentConstructor = state => {

    // lazily initialize the module
    module || (module = setupUIModule(moduleInitializer));

    // create new UI Component Instance
    const component = new CueComponent(
      module.template.cloneNode(true),
      module.imports,
      module.styles,
      module.keyframes
    );

    // initialize
    if (module.initialize) {
      module.initialize.call(component, state);
    }

    // return dom element for compositing
    return component.element;

  };

  CUE_UI_MODULES.set(name, ComponentConstructor);

  return ComponentConstructor;
  
}

function setupUIModule(moduleInitializer) { // runs only once per module

  // initializer can be function or plain config object (pre-checked for object condition in "registerUIModule")
  const CONFIG = typeof moduleInitializer === 'function' ? moduleInitializer(CUE_UI_PROTO) : moduleInitializer;

  if (!CONFIG || CONFIG.constructor !== Object) {
    throw new TypeError(`Can't create UI Module because the configuration function did not return a plain object.`);
  }

  if (!CONFIG.template) {
    throw new TypeError(`UI Module requires "template" property that specifies a DOM Element. // expect(template).toEqual(HTMLString || Selector || DOMNode).`);
  }

  const templateNode = createTemplateRootElement(CONFIG.template);

  return {
    template: templateNode,
    imports: CONFIG.imports || null,
    styles: CONFIG.styles ? scopeStylesToComponent(CONFIG.styles, templateNode): null,
    keyframes: CONFIG.keyframes ? scopeKeyframesToComponent(CONFIG.keyframes) : null,
    initialize: CONFIG.initialize || null,
    didMount: CONFIG.didMount || NOOP,
    didUpdate: CONFIG.didUpdate || NOOP,
    willUnmount: CONFIG.willUnmount || NOOP
  };

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