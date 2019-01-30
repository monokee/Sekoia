Cue.State('App-State', Module => ({

  imports: {
    //Limbs: Module.import('Character.Limbs')
  },

  props: { // default values
    name: '',
    secondsPassed: 0,
    x: 0,
    y: 0,
    position({x, y}) {
      return {top: y, left: x};
    },

  },

  initialize(props) {
    this.name = props.name;
  },

  // these actions (+ overridable default actions) live on the prototype
  startTicker() {
    this.ticker = setInterval(() => {
      this.secondsPassed++;
    }, 1000);
  },

  stopTicker() {
    clearInterval(this.ticker);
  }

}));