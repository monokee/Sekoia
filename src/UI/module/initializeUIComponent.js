
function initializeUIComponent(initializer) { // runs only once per module

  // componentInitializer can be function or plain config object (pre-checked for object condition in "registerUIModule")
  const CONFIG = typeof initializer === 'function' ? initializer.call(null, CUE_LIB.ui) : initializer;

  if (!CONFIG || CONFIG.constructor !== OBJ) {
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