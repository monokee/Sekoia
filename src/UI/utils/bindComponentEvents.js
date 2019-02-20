function bindComponentEvents(component, events) {

  let eventName, value;
  for (eventName in events) {

    value = events[eventName];

    if (component.events.has(eventName)) { // base event already registered

      addHandlerToBaseEvent(component.events.get(eventName), value, component);

    } else { // register new base event

      const eventStack = [];
      component.events.set(eventName, eventStack);
      addHandlerToBaseEvent(eventStack, value, component);

      component.element.addEventListener(eventName, e => {
        for (let i = 0; i < eventStack.length; i++) eventStack[i].call(component, e);
      });

    }

  }

}

function addHandlerToBaseEvent(eventStack, handlerOrDelegate, scope) {
  if (isFunction(handlerOrDelegate)) {
    eventStack.push(handlerOrDelegate);
  } else if (isObjectLike(handlerOrDelegate)) {
    for (const selector in handlerOrDelegate) {
      eventStack.push(e => {
        if (e.target.closest(selector)) {
          handlerOrDelegate[selector].call(scope, e);
        }
      });
    }
  }
}