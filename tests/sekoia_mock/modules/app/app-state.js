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
      this.imports.Child(props.child),
      this.imports.Child(props.child),
      this.imports.Child(props.child)
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
  }

}));