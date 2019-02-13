Cue.UI('Todo-Item', {

  template: (
    `<div class="item" data-complete="false">
        <div class="checkbox">
            <div class="bullet"></div>
            <div class="tick"></div>
            <div class="label"></div>
        </div>
        <div class="textField">
            <div class="text" contenteditable="false"></div>
            <div class="date"></div>
        </div>
        <div class="editIcon"></div>
     </div>`
  ),

  styles: {

    item: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: '0.75em 0.5em',
      margin: '1em 0 0',
      background: 'rgba(128,135,142,0.1)',
      opacity: 0.9,
      borderRadius: '5px',
      cursor: 'default',
      transition: 'background 150ms, opacity 150ms',
      '&:hover': {
        opacity: 8
      },
      '&:nth-child(odd)': {
        background: 'rgba(128,135,142,0.05)'
      },
      '&.editing': {
        opacity: 1
      },
      '&.completed': {
        opacity: 0.5
      },
      '&.completed:hover': {
        opacity: 0.4
      }
    },

    checkbox: {
      position: 'relative',
      display: 'inline-block',
      height: '24px',
      lineHeight: '24px',
      opacity: 0.75,
      transition: 'opacity 150ms',
      '--iconSize': '24px',
      '--iconHalf': 'calc(var(--iconSize) / 2)',

      '&:hover': {
        opacity: 1
      },
      '&.checked': {
        opacity: 1
      },

      '.bullet': {
        position: 'absolute',
        width: 'var(--iconSize)',
        height: 'var(--iconSize)',
        borderRadius: '50%',
        border: '3px solid #98a3ac',
        transition: 'border 150ms',
        boxSizing: 'border-box'
      },
      '&.checked .bullet': {
        border: '12px solid rgb(0,115,255)'
      },

      '.tick': {
        position: 'absolute',
        width: 'var(--iconSize)',
        height: 'var(--iconSize)',
        borderRadius: '50%',
        background: `rgb(0, 115, 255), url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 512 512\'%3e%3cpath fill=\'white\' d=\'M362.6 192.9L345 174.8c-.7-.8-1.8-1.2-2.8-1.2-1.1 0-2.1.4-2.8 1.2l-122 122.9-44.4-44.4c-.8-.8-1.8-1.2-2.8-1.2-1 0-2 .4-2.8 1.2l-17.8 17.8c-1.6 1.6-1.6 4.1 0 5.7l56 56c3.6 3.6 8 5.7 11.7 5.7 5.3 0 9.9-3.9 11.6-5.5h.1l133.7-134.4c1.4-1.7 1.4-4.2-.1-5.7z\'/%3e%3c/svg%3e") no-repeat center`,
        opacity: 0,
        transform: 'scale(0.33)',
        transition: 'opacity 150ms, transform 150ms'
      },
      '&.checked .tick': {
        opacity: 1,
        transform: 'scale(1)'
      },

      '.label': {
        marginLeft: '24px',
        paddingLeft: '12px'
      }
    }

  },

  initialize(state) {
    this.state = state;
    this.checkBox = this.select('.checkbox');
    this.textField = this.select('.textField');
    this.text = this.select('.text');
    this.date = this.select('.date');
  },

  bindEvents: {

    click: {
      '.checkbox'() {
        this.state.isComplete = !this.state.isComplete;
      }
    },

    dblclick: {
      '.textField'() {
        if (this.textField.getAttribute('contenteditable') === 'false') {
          this.textField.setAttribute('contenteditable', 'true');
          const range = document.createRange();
          range.selectNodeContents(this.textField);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    },

    focusout: {
      '.textField'() {
        this.textField.setAttribute('contenteditable', 'false');
        this.state.text = this.textField.textContent;
        window.getSelection().removeAllRanges();
      }
    },

    keydown: {
      '.textField'(e) {
        if (this.textField.getAttribute('contenteditable') === 'true' && e.which === 13) {
          e.preventDefault();
          this.textField.setAttribute('contenteditable', 'false');
          this.state.text = this.textField.textContent;
          window.getSelection().removeAllRanges();
        }
      }
    }

  },

  renderState: {

    isComplete(flag) {
      if (flag) {
        this.element.dataset.complete = 'true';
        this.addClass(this.checkBox, 'checked');
      } else {
        this.element.dataset.complete = 'false';
        this.removeClass(this.checkBox, 'checked');
      }
    },

    text(content) {
      this.text.textContent = content;
    }

  }

});