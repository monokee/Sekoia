
function createProxy(stateInstance) {

  return new Proxy(stateInstance, {
    get: proxyGetHandler,
    set: proxySetHandler,
    deleteProperty: proxyDeleteHandler
  });

}