Cue.State('Root', Module => ({

  imports: {
    Child: Module.import('Root.Child')
  },

  props: {
    name: 'I am a superstate!',
    child: {}
  },

  initialize(props) {
    this.name = props.name;
    this.child = this.imports.Child(props.child);
  }

}));

Cue.State('Root.Child', Module => ({

  imports: {
    //Limbs: Module.import('Character.Limbs')
  },

  props: {
    x: 0,
    y: 0,
    disabled: false,
    name: Module.inject('Root.name'),
    position({x, y}) {
      return {top: y, left: x};
    },
    positionInPixels({position}) {
      console.log(position); // TODO: position is undefined here... why?
      return `Top: ${position.top}px | Left: ${position.left}px `;
    },
    positionAndName({name, positionInPixels}) { // TODO: this doesn't seem to pull in "name" correctly because the entire computation is now unavailable!
      return `Local(computed): "${positionInPixels}", Injected: "${name}"`;
    }
  },

  initialize(props) {
    this.x = props.x;
    this.y = props.y;
    this.disabled = props.disabled;
    // TODO: injected prop is definitely undefined in initialize. not good. it has to be forwarded to the source (Root in this case)
    //console.log('injected name (at initialize time)', this.name);
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