Cue.UI('Todo-Item', Component => ({

  template: (
    `<div class="todoItem">
        <div class="checkbox" data-checked="false"></div>
        <div class="textField" contenteditable="false"></div>
     </div>`
  ),

  initialize(state) {
    console.log('%c [Todo-Item](initialize)', 'background: lightcyan; color: dodgerblue;');
    this.state = state;
    this.checkBox = this.select('.checkbox');
    this.textField = this.select('.textField');
  },

  bindEvents: {

    dblclick: {
      '.textField'(e) {
        this.textField.contentEditable = true;
      }
    },

    keydown: {
      '.textField'(e) {
        if (this.textField.contentEditable === true && e.which === 13) {
          this.textField.contentEditable = false;
          this.state.text = this.textField.textContent;
        }
      }
    }

  },

  renderState: {

    isComplete(o) {
      this.checkBox.dataset.checked = o.value;
    },

    text(o) {
      this.textField.textContent = o.value.trim();
    }

  }

}));