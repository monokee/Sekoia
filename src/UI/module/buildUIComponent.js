
function buildUIComponent(name, initializer) { // runs only once per component

  // componentInitializer can be function or plain config object (pre-checked for object condition in "registerUIModule")
  const config = typeof initializer === 'function' ? initializer.call(null, UI_COMPONENT) : initializer;

  if (!isPlainObject(config)) {
    throw new TypeError(`Can't create UI Module because the configuration function did not return a plain object.`);
  }

  if (!config.element) {
    throw new TypeError(`UI Module requires "element" property that specifies a DOM Element. // expect(element).toEqual(HTMLString || Selector || DOMNode).`);
  }

  const templateElement = createTemplateRootElement(config.element);

  // Automatically scope classNames to the component by replacing their names with unique names.
  // Scope prefix can be specified via '$scope' property on styles object. By default we use 'name' as prefix.
  // Output looks like: Scope-className for classes.
  // Function returns a map of the original name to the unique name or an empty map if no component-level styles exist.
  const styleScope = config.styles['$scope'] || name;
  const styles = scopeStylesToComponent(config.styles, templateElement, styleScope);

  // map of (eventTypeToken -> [Array, of, selector + handler pairs]. We attach these arrays to every instance directly under the token prop.
  const events = isObjectLike(config.events) ? createSyntheticEvents(config.events, styleScope, styles) : EMPTY_MAP;

  // Create an object that inherits from ComponentPrototype (DOM helper methods)
  const Component = oCreate(ComponentPrototype);

  // Add internal __CUE__ object to Component
  Component[__CUE__] = {
    template: templateElement,
    styles: styles,
    events: events,
    imports: config.imports || null,
    render: config.render || null,
    initialize: isFunction(config.initialize) ? config.initialize : NOOP
  };

  // Make imports top-level properties on instances (we do the same with state modules, via internalGetters)
  if (isObjectLike(config.imports)) {
    oAssign(Component, config.imports);
  }

  // Make custom methods top-level props on instances
  let key, val;
  for (key in config) {
    val = config[key];
    if (isFunction(val)) {
      Component[key] = val;
    }
  }

  return Component;

}