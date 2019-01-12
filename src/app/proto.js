
let CUE_ROOT_STATE = null;

let CUE_ROOT_COMPONENT_PARENT = document.body;
let CUE_ROOT_COMPONENT = null;

const CUE_APP_PROTO = oCreate(CUE_PROTO, {

  RootState: {

    get() {
      return CUE_ROOT_STATE;
    },

    set(data) {
      CUE_ROOT_STATE = data;
    }

  },

  RootComponent: {

    get() {
      return CUE_ROOT_COMPONENT;
    },

    set(component) {
      CUE_ROOT_COMPONENT = component;
    }

  },

  RootComponentParent: {

    get() {
      return CUE_ROOT_COMPONENT_PARENT;
    },

    set(domElement) {

      if (!domElement || !(domElement instanceof Element || domElement.nodeName)) {
        throw new TypeError(`RootComponentParent must be a DOM Element but is ${JSON.stringify(domElement)}`);
      }

      CUE_ROOT_COMPONENT_PARENT = domElement;

    }

  },

  importState: {

    value: function(name) {
      return CUE_STATE_PROTO.import(name);
    }

  },

  importComponent: {

    value: function(name) {
      return CUE_UI_PROTO.import(name);
    }

  },

  start: {

    value: function(initialProps) {

      if (!CUE_ROOT_STATE) {
        throw new Error(`Application can't start because no RootState has been defined.`);
      }

      if (typeof CUE_ROOT_COMPONENT !== 'function') {
        throw new Error(`Application can't start because no RootComponent has been defined.`);
      }

      CUE_ROOT_COMPONENT_PARENT.appendChild(
        CUE_ROOT_COMPONENT(
          createProxy(
            StateInternals.assignTo(typeof CUE_ROOT_STATE === 'function'
              ? CUE_ROOT_STATE(initialProps)
              : CUE_ROOT_STATE
            )
          )
        )
      );

    }

  }

});