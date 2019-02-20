
function initializeUIComponent(initializer) { // runs only once per module

  // componentInitializer can be function or plain config object (pre-checked for object condition in "registerUIModule")
  const config = typeof initializer === 'function' ? initializer.call(null, UI_COMPONENT) : initializer;

  if (!isPlainObject(config)) {
    throw new TypeError(`Can't create UI Module because the configuration function did not return a plain object.`);
  }

  if (!config.element) {
    throw new TypeError(`UI Module requires "element" property that specifies a DOM Element. // expect(element).toEqual(HTMLString || Selector || DOMNode).`);
  }

  const templateElement = createTemplateRootElement(config.element);

  // automatically scope classNames or keyframes to the component by replacing their names with unique names.
  // functions return a map of the original name to the unique name or an empty map if no component-level styles/keyframes exist.
  const styles = scopeStylesToComponent(config.styles, templateElement);

  // rewrite delegated event selectors to internally match the scoped classNames
  if (config.events && styles.size > 0) {
    translateEventSelectorsToScope(config.events, styles);
  }

  return {
    element: templateElement,
    imports: config.imports || null,
    styles: styles,
    initialize: config.initialize || null,
    events: config.events || null,
    render: config.render || null
  };

}