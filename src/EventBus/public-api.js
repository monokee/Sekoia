
CUE_API.EventBus = wrap(() => {

  const eventStore = new Map();
  const eventError = `Can't add listener because the provided arguments are invalid.`;

  let _type, _handler, _scope, _events, _event, _disposable = [];

  const addEvent = (type, handler, scope, once) => {
    const event = {
      handler: handler,
      scope  : scope,
      once   : once
    };
    if (eventStore.has(type)) {
      eventStore.get(type).push(event);
    } else {
      eventStore.set(type, [event]);
    }
  };

  const addEvents = (events, scope, once) => {
    for (_type in events) {
      _handler = events[_type];
      if (isFunction(_handler)) {
        addEvent(_type, _handler, scope, once);
      } else {
        throw new TypeError(`Can't add listener because handler for "${_type}" is not a function but of type ${typeof _handler}`);
      }
    }
  };
  
  return {

    on: (type, handler, scope) => {
      if (isObjectLike(type)) {
        _scope = isObjectLike(handler) ? handler : null;
        addEvents(type, _scope, false);
      } else if (typeof type === 'string' && isFunction(handler)) {
        _scope = isObjectLike(scope) ? scope : null;
        addEvent(type, handler, _scope, false);
      } else {
        throw new TypeError(eventError);
      }
    },

    once: (type, handler, scope) => {
      if (isObjectLike(type)) {
        _scope = isObjectLike(handler) ? handler : null;
        addEvents(type, _scope, true);
      } else if (typeof type === 'string' && isFunction(handler)) {
        _scope = isObjectLike(scope) ? scope : null;
        addEvent(type, handler, _scope, true);
      } else {
        throw new TypeError(eventError);
      }
    },

    off: type => {
      eventStore.delete(type);
    },

    trigger: (type, ...payload) => {
      if ((_events = eventStore.get(type))) {
        for (let i = 0; i < _events.length; i++) {
          _event = _events[i];
          _event.handler.apply(_event.scope, payload);
          if (_event.once) _disposable.push(_event);
        }
        if (_disposable.length) {
          eventStore.set(type, _events.filter(event => _disposable.indexOf(event) === -1));
          _disposable.splice(0, _disposable.length);
        }
        _events = null;
      }
    }
    
  }
  
});