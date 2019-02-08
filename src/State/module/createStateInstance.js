
/**
 * Creates a state instance from a data object and a module blueprint. The data is expected to be unique in the state tree (no circular reference).
 * When available, the parent object and the ownPropertyName of the data object on the parent object can be passed.
 * When called from a StateFactory function, props can be passed in so that the internals can later pass those props into the initialize function of the instance.
 * @param {object}          data              - The data that will be turned into a cue state instance.
 * @param {object}          module            - The module blueprint the instance inherits from.
 * @param {(object|null)}   [props]           - When this function is called from a StateFactory that received props, we pass those props into the internals so that we can later call a modules initialize method with these props.
 */
function createStateInstance(data, module, props = null) {

  // 1. Attach Internals to "data" under private __CUE__ symbol.
  const internals = data[__CUE__] = new StateInternals(module);

  // 2. Wrap "data" into a reactive proxy
  const proxyState = new Proxy(data, {
    get: proxyGetHandler,
    set: proxySetHandler,
    deleteProperty: proxyDeleteHandler
  });

  // 3. Give Internals explicit reference to both the plain "data" and the wrapped proxy
  internals.plainState = data;
  internals.proxyState = proxyState;

  // 4. When called from a StateFactory, pass initial props to Internals
  if (props !== null) {
    internals.initialProps = props;
  }

  // 5. Return
  return {
    plainState: data,
    proxyState: proxyState,
    internals: internals
  }

}