
let CUE_ROOT_STATE = null;

let CUE_ROOT_COMPONENT_PARENT = document.body;
let CUE_ROOT_COMPONENT = null;

const CUE_APP_PROTO = create(CUE_PROTO, {

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

      if (!this.RootState) {
        throw new Error(`Application can't start because no RootState has been defined.`);
      }

      if (!this.RootComponent) {
        throw new Error(`Application can't start because no RootComponent has been defined.`);
      }

      const rootState = typeof this.RootState === 'function' ? this.RootState(initialProps) : this.RootState;

      CUE_ROOT_COMPONENT_PARENT.appendChild(this.RootComponent(createProxy(StateInternals.assignTo(rootState))));

    }

  }

});