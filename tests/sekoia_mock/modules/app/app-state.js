Cue.State('App-State', Module => ({

  imports: {
    //Limbs: Module.import('Character.Limbs')
  },

  props: { // default values
    name: '',
    secondsPassed: 0,
    x: 0,
    y: 0,
    disabled: false,
    soloCount: 0,
    position({x, y}) {
      return {top: y, left: x};
    },
    positionInPixels({secondsPassed, position}) {
      return `Top: ${position.top}px | Left: ${position.left}px (after ${secondsPassed} seconds)`;
    }
  },

  willChange: {
    /**
     * Interceptor methods are run before reactions but after an actual mutation has been detected.
     * The sole purpose of interceptors is to conditionally: a) rewrite observation.value and/or b) raise side-effects
     * Because interceptions can rewrite observation.value, another equality check is performed after an interceptor has run
     * to determine if change-reactions should be run next.
     *
     **/
    soloCount(o) {
      if (o.value > 99) {
        o.value = o.oldValue;
        Module.trigger('WARNINGS.maximumSoloItemsReached'); // TODO: can this be problematic?
      }
    }
  },

  didChange: {
    /**
     * Change Reactions are run after a state property has been mutated and are simple side-effects.
     * These are the same as UI-side reactions and will run in the same cue.
     *
     * */
  },

  initialize(props) {

    this.name = props.name;

    /*Module.on({ // TODO: refactor to lifecycle method? (like on: {} or listenTo: {})
      'someOtherComponent-saysHi'(e) {
        if (e.value === 'someCoolThingHappened') {
          this.startTicker();
        } else {
          this.stopTicker();
        }
      },
      'childElementSolo'() {
        this.soloCount++;
      },
      'childElementUnSolo'() {
        this.soloCount--;
      }
    });*/

  },

  // these actions (+ overridable default actions) live on the prototype
  startTicker() {

    this.ticker = setInterval(() => {
      this.secondsPassed++;
    }, 1000);

    //Module.trigger('ticker-started'); // -> other modules can subscribe to this.

  },

  stopTicker() {
    clearInterval(this.ticker);
  }

}));