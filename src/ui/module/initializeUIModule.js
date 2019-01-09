
function initializeUIModule(moduleInitializer) { // runs only once per module

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