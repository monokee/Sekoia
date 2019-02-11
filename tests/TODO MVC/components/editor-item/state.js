Cue.State('Todo-Item', Module => ({

  props: {
    text: '',
    isComplete: false
  },

  initialize(props) {
    console.log('%c [Todo-Item](initialize)', 'background: cornsilk; color: chocolate;');
    this.text = props.text || this.text;
    this.isComplete = props.isComplete || this.isComplete;
  }

}));