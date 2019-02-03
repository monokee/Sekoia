
function initializeUIComponent(initializer) { // runs only once per module

  // componentInitializer can be function or plain config object (pre-checked for object condition in "registerUIModule")
  const config = typeof initializer === 'function' ? initializer.call(null, UI_COMPONENT) : initializer;

  if (!isPlainObject(config)) {
    throw new TypeError(`Can't create UI Module because the configuration function did not return a plain object.`);
  }

  if (!config.template) {
    throw new TypeError(`UI Module requires "template" property that specifies a DOM Element. // expect(template).toEqual(HTMLString || Selector || DOMNode).`);
  }

  const templateNode = createTemplateRootElement(config.template);

  // automatically scope classNames or keyframes to the component by replacing their names with unique names.
  // functions return a map of the original name to the unique name or an empty map if no component-level styles/keyframes exist.
  const styles = scopeStylesToComponent(config.styles, templateNode);
  const keyframes = scopeKeyframesToComponent(config.keyframes);

  // rewrite delegated event selectors to internally match the scoped classNames
  if (config.bindEvents && styles.size > 0) {
    let eventName, x, selector, scopedSelector;
    for (eventName in config.bindEvents) {
      x = config.bindEvents[eventName];
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
    imports: config.imports || null,
    styles: styles,
    keyframes: keyframes,
    initialize: config.initialize || null,
    bindEvents: config.bindEvents || null,
    renderState: config.renderState || null
  };

}