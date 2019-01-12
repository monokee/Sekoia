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

    setInterval(() => {
      this.secondsPassed++;
    }, 1000);

  }

}));