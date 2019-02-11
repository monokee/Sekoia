
/**
 * Creates a state instance from a data object and a module blueprint. The data is expected to be unique in the state tree (no circular reference).
 * When available, the parent object and the ownPropertyName of the data object on the parent object can be passed.
 * When called from a StateFactory function, props can be passed in so that the internals can later pass those props into the initialize function of the instance.
 * @param {object}          data    - The data that will be turned into a cue state instance.
 * @param {object}          module  - The module blueprint the instance inherits from.
 * @param {number}          type    - Either 1 when state is created from a module or 2 when state is created as a nested sub-state of a module based parent state.
 * @param {(object|null)}   [props] - When this function is called from a StateFactory that received props, we pass those props into the internals so that we can later call a modules initialize method with these props.
 */
function createState(data, module, type, props) {

  console.log('%c createState from::::', 'background: paleGreen; color: darkGreen;', data);

  // 1. Attach Internals to "data" under private __CUE__ symbol.
  const internals = data[__CUE__] = new StateInternals(module, type);

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
  if (props) internals.initialProps = props;

  // 5. Recursively createState for all object children that are not yet states.
  // TODO: don't mount sub-instances here. Do this in instanceDidMount, recursively for the children. only create state here.
  if (isArray(data)) {

    for (let i = 0, val; i < data.length; i++) {
      val = data[i];
      if (typeof val === 'object' && val !== null) {
        val = val[__CUE__] || createState(val, module, STATE_TYPE_EXTENSION, null).internals;
        if (val.mounted === false) {
          data[i] = val.proxyState;
          //val.instanceDidMount(data, i);
        }
      }
    }

  } else {

    const keys = oKeys(data);
    for (let i = 0, key, val; i < keys.length; i++) {
      key = keys[i];
      val = data[key];
      if (typeof val === 'object' && val !== null) {
        val = val[__CUE__] || createState(val, module, STATE_TYPE_EXTENSION, null).internals;
        if (val.mounted === false) {
          data[key] = val.proxyState;
          //val.instanceDidMount(data, key);
        }
      }
    }

  }

  // 6. Return
  return {
    plainState: data,
    proxyState: proxyState,
    internals: internals
  }

}