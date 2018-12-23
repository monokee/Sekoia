
let CUE_ROOT_COMPONENT_PARENT = document.body;
let CUE_ROOT_COMPONENT = null;

const CUE_APP_PROTO = create(CUE_PROTO, {

  RootState: {

    get() {
      return STORE.ROOT;
    },

    set(data) {
      STORE.ROOT = Observable.create(data, STORE, 'ROOT');
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
        throw new TypeError(`RootComponentParent must be a DOM Element but is of type ${typeof domElement}`);
      }

      CUE_ROOT_COMPONENT_PARENT = domElement;

    }

  },

  import: {

    value: function(type, name) {

      if (type === 'state') {
        return CUE_STATE_PROTO.import(name);
      }

      if (type === 'component') {
        return CUE_UI_PROTO.import(name);
      }

      throw new ReferenceError(`Can't import "${name}" from "${type}" modules because no such component has been registered.`);

    }

  },

  start: {

    value: function() {

      if (!this.RootState) {
        throw new Error(`Application can't start because no RootState has been defined.`);
      }

      if (!this.RootComponent) {
        throw new Error(`Application can't start because no RootComponent has been defined.`);
      }

      const rootState = typeof this.RootState === 'function' ? this.RootState() : this.RootState;

      CUE_ROOT_COMPONENT_PARENT.appendChild(this.RootComponent(rootState));

    }

  }

});