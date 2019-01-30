
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

  // automatically scope classNames or keyframes to the component by replacing their names with unique names.
  // functions return a map of the original name to the unique name or an empty map if no component-level styles/keyframes exist.
  const styles = scopeStylesToComponent(CONFIG.styles, templateNode);
  const keyframes = scopeKeyframesToComponent(CONFIG.keyframes);

  // rewrite delegated event selectors to internally match the scoped classNames
  if (CONFIG.bindEvents && styles.size > 0) {
    let eventName, x, selector, scopedSelector;
    for (eventName in CONFIG.bindEvents) {
      x = CONFIG.bindEvents[eventName];
      if (isObjectLike(x)) { // event type has sub-selectors
        for (selector in x) {
          if (selector[0] === '.') {
            scopedSelector = styles.get(selector.substring(1));
            if (scopedSelector) {
              x['.' + scopedSelector] = x[selector]; // swap .scoped/.unscoped in-place
              delete x[selector];
            }
          }
        }
      }
    }
  }

  return {
    template: templateNode,
    imports: CONFIG.imports || null,
    styles: styles,
    keyframes: keyframes,
    initialize: CONFIG.initialize || null,
    bindEvents: CONFIG.bindEvents || null,
    renderState: CONFIG.renderState || null
  };

}