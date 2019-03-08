
function buildUIModule(name, initializer) { // runs only once per component

  // componentInitializer can be function or plain config object (pre-checked for object condition in "registerUIModule")
  const config = isFunction(initializer) ? initializer.call(null, UI_COMPONENT) : initializer;

  if (!isPlainObject(config)) {
    throw new TypeError(`Can't create UI Module because the configuration function did not return a plain object.`);
  }

  if (!config.element) {
    throw new TypeError(`UI Module requires "element" property that specifies a DOM Element. // expect(element).toEqual(HTMLString || Selector || DOMNode).`);
  }

  let tmp;
  const templateElement = (tmp = createTemplateRootElement(config.element)).tagName === TAGNAME_TEMPLATE ? DOC.importNode(tmp, true).content.children[0] : tmp;
  const refPaths = generateRefPaths(templateElement);
  const hasStyles = isObjectLike(config.styles);
  const styleScope = hasStyles ? (config.styles['$scope'] || name) : name;
  const scopedStyles = hasStyles ? scopeStylesToComponent(config.styles, templateElement, styleScope) : EMPTY_MAP;
  const reactions = isObjectLike(config.render) ? preCompileReactions(config.render) : EMPTY_ARRAY;
  const events = isObjectLike(config.events) ? createSyntheticEvents(config.events, styleScope, scopedStyles) : EMPTY_ARRAY;
  const initialize = isFunction(config.initialize) ? config.initialize : NOOP;

  class Module extends CueUIComponent {

    constructor(state) {

      // 1. Create instance Element by cloning template
      const element = templateElement.cloneNode(true);

      // 2. Create instance
      super(element, scopedStyles);

      let i;

      // 3. Assign $refs to "this"
      CUE_TREEWALKER.currentNode = element;
      for (i = 0; i < refPaths.length; i += 2) { // i = name of ref, i+1 = nodeIndex in tree
        this[refPaths[i]] = new CueUIComponent(getRefByIndex(refPaths[i + 1]), scopedStyles);
      }

      // 4. Initialize lifecycle method
      initialize.call(this, state);
      if (state && state !== this.state) { // auto-assign state
        this.state = state;
      }


      // 5. Install state reactions (will throw if state has not been assigned via initialize but there are reactions...)
      for (i = 0; i < reactions.length; i += 2) {
        this.state[__CUE__].addChangeReaction(reactions[i], reactions[i + 1].bind(this));
      }

      // 6. Assign synthetic Events
      for (i = 0; i < events.length; i += 2) {
        element[events[i]] = { scope: this, handlers: events[i + 1] };
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