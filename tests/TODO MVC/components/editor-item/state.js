Cue.State('Todo-Item', {

  data: {
    text: '',
    isComplete: false,
    selected: false,
    visible: true
  },

  initialize({text = this.text, isComplete = this.isComplete}) {
    this.text = text;
    this.isComplete = isComplete;
  }

});