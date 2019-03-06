
function buildUIModule(name, initializer) { // runs only once per component

  // componentInitializer can be function or plain config object (pre-checked for object condition in "registerUIModule")
  const config = isFunction(initializer) ? initializer.call(null, UI_COMPONENT) : initializer;

  if (!isPlainObject(config)) {
    throw new TypeError(`Can't create UI Module because the configuration function did not return a plain object.`);
  }

  if (!config.element) {
    throw new TypeError(`UI Module requires "element" property that specifies a DOM Element. // expect(element).toEqual(HTMLString || Selector || DOMNode).`);
  }

  const templateElement = createTemplateRootElement(config.element);
  const refPaths = generateRefPaths(templateElement);
  const styleScope = config.styles['$scope'] || name;
  const scopedStyles = isObjectLike(config.styles) ? scopeStylesToComponent(config.styles, templateElement, styleScope) : EMPTY_MAP;
  const reactions = isObjectLike(config.render) ? config.render : null;
  const events = isObjectLike(config.events) ? createSyntheticEvents(config.events, styleScope, scopedStyles) : EMPTY_MAP;
  const initialize = isFunction(config.initialize) ? config.initialize : NOOP;

  class Module extends CueUIComponent {

    constructor(state) {

      // 1. Create instance Element by cloning template
      const element = templateElement.cloneNode(true);

      // 2. Create instance
      super(element, scopedStyles);

      // 3. Assign refs to "this"
      if (refPaths.length) {
        CUE_TREEWALKER.currentNode = element;
        for (let i = 0; i < refPaths.length; i += 2) { // i = name of ref, i+1 = nodeIndex in tree
          this[refPaths[i]] = new CueUIComponent(getRefByIndex(refPaths[i + 1]), scopedStyles);
        }
      }

      // 4. Initialize lifecycle method
      initialize.call(this, state);

      // 5. Install state reactions (if state has been assigned via initialize)
      if (reactions !== null && this.state) {
        for (const prop in reactions) {
          this.state[__CUE__].addChangeReaction(prop, reactions[prop].bind(this));
        }
      }

      // 6. Assign synthetic Events
      if (events.size > 0) {
        events.forEach((handlers, eventTypeToken) => {
          element[eventTypeToken] = {
            scope: this,
            handlers: handlers
          }
        });
      }

    }

  }

  // Module Prototype
  if (isObjectLike(config.imports)) { // raise imports to top-level
    oAssign(Module.prototype, config.imports);
  }

  for (const key in config) { // raise methods to top-level
    if (key !== 'initialize' && isFunction(config[key])) {
      Module.prototype[key] = config[key];
    }
  }

  return Module;

}