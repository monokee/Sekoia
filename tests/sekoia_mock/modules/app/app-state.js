Cue.State('Root', Module => ({

  imports: {
    Child: Module.import('Root-Child')
  },

  props: {
    name: 'I am a superstate!',
    children: []
  },

  initialize(props) {
    this.name = props.name;
    this.children.push(
      this.imports.Child(props.child), // these will not inherit computed properties etc from their parent because they are MODULE based (so they have their own!)
      this.imports.Child(props.child), // if these were not module based, they WOULD inherit properties from their parent module. The difference is made between module based and non-module based state.
      this.imports.Child(props.child)  // if a piece of state is based on its own module, it has its own computeds and providers. if not, it is regarded as an extension of its parent. StateExtension vs StateInstance
    );
  }

}));

Cue.State('Root-Child', Module => ({

  props: {
    x: 0,
    y: 0,
    disabled: false,
    name: Module.inject('Root.name'),
    position({x, y}) {
      return {top: y, left: x};
    },
    positionInPixels({position}) {
      return `Top: ${position.top}px | Left: ${position.left}px `;
    },
    positionAndName({name, positionInPixels}) {
      return `Local(computed): "${positionInPixels}", Injected: "${name}"`;
    }
  },

  initialize(props) {
    this.x = props.x;
    this.y = props.y;
    this.disabled = props.disabled;
  },

  willChange: { //TODO: implement interceptors
    soloCount(o) {
      if (o.value > 99) {
        o.value = o.oldValue;
        Module.trigger('WARNINGS.maximumSoloItemsReached');
      }
    }
  },

  didChange: { //TODO: implement self-observing reactions

  }

}));