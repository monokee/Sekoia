
function wrapStateInProxy(stateInstance) {

  return new Proxy(stateInstance, {
    get: proxyGetTrap,
    set: proxySetTrap,
    deleteProperty: proxyDeleteTrap
  });

}