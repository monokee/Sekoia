Cue.State('Todo-Item', Module => ({

  data: {
    text: '',
    isComplete: false,
    selected: false
  },

  initialize(props) {
    this.text = props.text;
    this.isComplete = props.isComplete;
  }

}));