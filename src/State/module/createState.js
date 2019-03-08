
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

  // 1. Attach Internals to "data" under private __CUE__ symbol.
  const internals = data[__CUE__] = type === STATE_TYPE_MODULE ? new StateModuleInternals(module, type) : new StateExtensionInternals(module, type);

  // 2. Give Internals explicit reference to both the plain "data" and the wrapped proxy
  internals.plainState = data;
  internals.proxyState = new Proxy(data, {
    get: proxyGetHandler,
    set: proxySetHandler,
    deleteProperty: proxyDeleteHandler
  });

  // 3. When called from a StateFactory, pass initial props to Internals
  if (props) internals.initialProps = props;

  return internals;

}

function createAndMountSubStates(internals) {

  if (isArray(internals.plainState)) {

    for (let i = 0, val; i < internals.plainState.length; i++) {

      val = internals.plainState[i];

      if (typeof val === 'object' && val !== null) {

        val = val[__CUE__] || createState(val, internals.module, STATE_TYPE_EXTENSION, null);

        if (val.mounted === false) {
          internals.plainState[i] = val.proxyState;
          val.instanceDidMount(internals.plainState, i);
        }

        createAndMountSubStates(val);

      }

    }

  } else {

    const keys = oKeys(internals.plainState);

    for (let i = 0, key, val; i < keys.length; i++) {

      key = keys[i];
      val = internals.plainState[key];

      if (typeof val === 'object' && val !== null) {

        val = val[__CUE__] || createState(val, internals.module, STATE_TYPE_EXTENSION, null);

        if (val.mounted === false) {
          internals.plainState[key] = val.proxyState;
          val.instanceDidMount(internals.plainState, key);
        }

        createAndMountSubStates(val);

      }

    }

  }

}