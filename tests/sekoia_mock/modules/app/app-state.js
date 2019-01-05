Cue.State('App', Module => ({

  imports: {
    //Limbs: Module.import('Character.Limbs')
  },

  props: { // default values
    name: '',
    secondsPassed: 0,
    health: 100,
    stamina: 100,
    limbs: [],
    isDead({health}) {
      return health <= 0;
    },
    canFight({stamina}) {
      return stamina > 0;
    }
  },

  initialize(props) {

    this.name = props.name;

  },

  // these actions (+ overridable default actions) live on the prototype
  startTicker() {

    console.log('ticker in state starting. "this":', this);

    // TODO: "this" refers to a plain data object -> "this" has to be swapped out as soon as the object is turned into an observe.
    // TODO: based on the API design, refactor the entire state handling to become much more efficient (+ we're pre separating default from computed props which can be useful!)
    //setInterval(() => {
    //  this.secondsPassed++;
    //}, 1000);

  }

}));