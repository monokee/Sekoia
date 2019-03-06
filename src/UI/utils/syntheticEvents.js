
function createSyntheticEvents(events, rootScope, scopedStyles) {

  const types = oKeys(events);

  const eventHandlers = new Map();

  for (let i = 0, type, token, val; i < types.length; i++) {

    type = types[i];
    token = SYNTHETIC_EVENT_KEYS.get(type) || Symbol(`Synthetic "${type}" event`);
    val = events[type];

    // Bind single self-bubbling event handler per event type.
    if (!SYNTHETIC_EVENT_KEYS.has(type)) {
      DOC.addEventListener(type, e => globalSyntheticEventHandler(e, token));
      SYNTHETIC_EVENT_KEYS.set(type, token);
    }

    // Create a pseudo-2D Array which contains consecutive pairs of 'selector' + handler.
    eventHandlers.set(token, isObjectLike(val) ? getScopedSelectorHandlers(val, scopedStyles) : [rootScope, val]);

  }

  // return a map of shape: { eventTypeToken: [...selector + handler(), selector + handler()...] }
  // we use this map to attach a pointer to the handler array to every new instance of a component under the type token.
  return eventHandlers;

}

function globalSyntheticEventHandler(event, token) {

  let node = event.target, eventStore, handlers, i;

  while (node !== null && event.cancelBubble === false) {

    eventStore = node[token];

    if (eventStore) {

      handlers = eventStore.handlers;

      for (i = 0; i < handlers.length; i += 2) {

        if (event.target.closest(handlers[i])) {
          handlers[i + 1].call(eventStore.scope, event);
        }

        if (event.cancelBubble === true) {
          break;
        }

      }

    }

    node = node.parentNode;

  }

}

function getScopedSelectorHandlers(selectors, scopedStyles) {

  const scopedSelectorFunctionArray = [];

  for (const selector in selectors) {

    let normalizedSelector = selector;
    let subString, scopedSelector;

    // if selector doesnt start with (. # [ * ) and is not html5 tag name, assume omitted leading dot.
    if (selector[0] !== '.' && selector[0] !== '#' && selector[0] !== '[' && selector[0] !== '*' && !HTML5_TAGNAMES.has(selector)) {
      normalizedSelector = '.' + selector;
    }

    if (scopedStyles.has(normalizedSelector)) {
      scopedSelector = '.' + scopedStyles.get(normalizedSelector);
    } else if (scopedStyles.has((subString = normalizedSelector.substring(1)))) {
      scopedSelector = '.' + scopedStyles.get(subString);
    } else {
      scopedSelector = normalizedSelector;
    }

    scopedSelectorFunctionArray.push(scopedSelector, selectors[selector]);

  }

  return scopedSelectorFunctionArray;

}