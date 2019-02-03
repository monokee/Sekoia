
/**
 * Wraps a state object into a reactive ES6 Proxy
 * so that any get, set and delete mutations can be intercepted for change-event handling.
 * @function createProxy
 * @param   {object} stateInstance      - The object we are wrapping.
 * @returns {object} stateInstanceProxy - The intercepted stateInstance.
 */
function createProxy(stateInstance) {

  return new Proxy(stateInstance, {
    get: proxyGetHandler,
    set: proxySetHandler,
    deleteProperty: proxyDeleteHandler
  });

}