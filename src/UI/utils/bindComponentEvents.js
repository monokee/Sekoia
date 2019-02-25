
function bindComponentEvents(componentInstance, events) {

  let eventName, value;
  for (eventName in events) {

    value = events[eventName];

    if (componentInstance.events.has(eventName)) { // base event already registered

      addHandlerToBaseEvent(componentInstance.events.get(eventName), value, componentInstance);

    } else { // register new base event

      const eventStack = [];
      componentInstance.events.set(eventName, eventStack);
      addHandlerToBaseEvent(eventStack, value, componentInstance);

      componentInstance.element.addEventListener(eventName, e => {
        for (let i = 0; i < eventStack.length; i++) eventStack[i].call(componentInstance, e);
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