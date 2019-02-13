Cue.State('Todo-Item', Module => ({

  props: {
    text: '',
    isComplete: false
  },

  initialize(props) {
    this.text = props.text;
    this.isComplete = props.isComplete;
  }

}));