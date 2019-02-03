Cue.State('App-State', Module => ({

  imports: {
    //Limbs: Module.import('Character.Limbs')
  },

  props: {
    name: '',
    secondsPassed: 0,
    x: 0,
    y: 0,
    disabled: false,
    soloCount: 0,
    //selectedItems: Module.inject('sourceState.propertyName', {readOnly: false}),
    position({x, y}) {
      return {top: y, left: x};
    },
    positionInPixels({position}) {
      return `Top: ${position.top}px | Left: ${position.left}px `;
    }
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

  },

  initialize(props) {
    this.name = props.name;
  },

  startTicker() {
    this.ticker = setInterval(() => {
      this.secondsPassed++;
    }, 1000);
  },

  stopTicker() {
    clearInterval(this.ticker);
  }

}));