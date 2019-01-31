
/**
 * CUE_LIB.state Proto
 * Available as "Module" Object in module registration closure.
 * Has it's own Event Bus implementation to simply and loosely exchange messages between
 * deeply nested state instances. Because there are other, primary means of (reactive) communication
 * that naturally solve most cross-realm communication problems much better, the use of the event bus is
 * automatically reserved for inter-module communication which, when required, is a very nice and performant abstraction.
 *
 * Also extends CUE_LIB.core so that any helper libraries and plugins are also available under "Module".
 * Below code definitely needs some cleaning up...
 */
{

  const STATE_EVENTS = new Map();
  const STATE_EVENTS_ARGS_ERROR = `Can't add listener because the provided arguments are invalid.`;

  let _type, _handler, _scope, _events, _event, _disposable = [];

  const addEvent = (type, handler, scope, once) => {
    const event = {
      handler: handler,
      scope: scope,
      once: once
    };
    if (STATE_EVENTS.has(type)) {
      STATE_EVENTS.get(type).push(event);
    } else {
      STATE_EVENTS.set(type, [event]);
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

  /**
   * @namespace {object} CUE_LIB.state
   * @extends   {object} CUE_LIB.core
   */
  CUE_LIB.state = oCreate(CUE_LIB.core, {

    /**
     * Import another state module that the current instance can extend itself with.
     * @function import
     * @memberOf CUE_LIB.state
     * @param   {string}    name  - The unique name of the Cue.State module to be imported.
     * @returns {function}  state - The factory function of the imported module.
     */
    import: {
      value: function (name) {
        const state = CUE_STATE_MODULES.get(name);
        if (!state) throw new ReferenceError(`Can't import State Module because nothing is registered under "${name}".`);
        return state;
      }
    },

    on: (type, handler, scope) => {

      if (isObjectLike(type)) {
        _scope = typeof handler === 'object' ? handler : null;
        addEvents(type, _scope, false);
      } else if (typeof type === 'string' && isFunction(handler)) {
        _scope = typeof scope === 'object' ? scope : null;
        addEvent(type, handler, _scope, false);
      } else {
        throw new TypeError(STATE_EVENTS_ARGS_ERROR);
      }

    },

    once: (type, handler, scope) => {

      if (isObjectLike(type)) {
        _scope = typeof handler === 'object' ? handler : null;
        addEvents(type, _scope, true);
      } else if (typeof type === 'string' && isFunction(handler)) {
        _scope = typeof scope === 'object' ? scope : null;
        addEvent(type, handler, _scope, true);
      } else {
        throw new TypeError(STATE_EVENTS_ARGS_ERROR);
      }

    },

    off: type => {
      STATE_EVENTS.delete(type);
    },

    trigger: (type, ...payload) => {

      if ((_events = STATE_EVENTS.get(type))) {

        for (let i = 0; i < _events.length; i++) {
          _event = _events[i];
          _event.handler.apply(_event.scope, payload);
          if (_event.once) _disposable.push(_event);
        }

        if (_disposable.length) {
          STATE_EVENTS.set(type, _events.filter(event => _disposable.indexOf(event) === -1));
          _disposable.length = 0;
        }

        _events = null;

      }

    }

  });

}