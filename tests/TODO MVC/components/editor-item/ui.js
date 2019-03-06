Cue.UI('Todo-Item', {

  element: (
    `<div class="item" data-complete="false">
        <div class="checkbox">
            <div class="bullet"></div>
            <div class="tick"></div>
            <div class="label"></div>
        </div>
        <div class="textField">
            <div class="text" contenteditable="false"></div>
        </div>
        <div class="editButton">edit</div>
     </div>`
  ),

  styles: {

    item: {
      position: 'relative',
      width: '100%',
      flex: '0 0 auto',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '2.5em',
      margin: '0.85em 0 0',
      background: '#13161A',
      opacity: 0.9,
      borderRadius: '5px',
      boxShadow: '0px 4px 5px 0px rgba(0,0,0,0.25)',
      cursor: 'default',
      transition: 'opacity 150ms',
      '&:hover:not(.complete)': {
        opacity: 8,

        '.editButton': {
          opacity: 1
        }
      },
      '&.selected': {
        opacity: 1,
        '&::after': {
          position: 'absolute',
          display: 'block',
          content: '',
          left: 0,
          right: 0,
          bottom: 0,
          height: '1px',
          background: 'rgb(0,115,255)'
        }
      },
      '&.hidden': {
        display: 'none'
      },

      '.textField': {
        position: 'relative',
        padding: '0 2em',
        textAlign: 'center',

        '.text': {
          position: 'relative',
          height: '100%',
          transform: 'scale(1)',
          opacity: 1,
          transition: 'transform 150ms ease-in-out, opacity 150ms'
        }

      },

      '.editButton': {
        fontSize: '0.7em',
        textDecoration: 'underline',
        opacity: 0.25,
        transition: 'opacity 150ms',
        cursor: 'pointer',
        '&:hover': {
          opacity: 0.8
        },
        '&.disabled': {
          pointerEvents: 'none'
        }
      },

      '&.complete': {

        '.editButton': {
          pointerEvents: 'none'
        },

        '.text': {
          transform: 'scale(0.9)',
          opacity: 0.5
        },

      }

    },

    checkbox: {
      position: 'relative',
      display: 'inline-block',
      width: 'var(--iconSize)',
      height: 'var(--iconSize)',
      lineHeight: 'var(--iconSize)',
      cursor: 'pointer',
      opacity: 0.75,
      transition: 'opacity 150ms',
      '--iconSize': '24px',
      '--iconHalf': 'calc(var(--iconSize) / 2)',

      '&:hover': {
        opacity: 1
      },

      '&.checked': {
        opacity: 1,

        '.bullet': {
          transform: 'scale(0)'
        },

        '.tick': {
          transform: 'scale(2)'
        }

      },

      '.bullet': {
        position: 'absolute',
        width: 'var(--iconSize)',
        height: 'var(--iconSize)',
        borderRadius: '50%',
        border: '3px solid #98a3ac',
        boxSizing: 'border-box',
        transform: 'scale(1)',
        transition: 'transform 200ms ease-in-out'
      },

      '.tick': {
        position: 'absolute',
        width: 'var(--iconSize)',
        height: 'var(--iconSize)',
        borderRadius: '50%',
        background: 'url(assets/check.svg)',
        transform: 'scale(0)',
        transition: 'transform 150ms ease-in-out'
      },

      '.label': {
        marginLeft: '24px',
        paddingLeft: '12px'
      }
    },

  },

  initialize(state) {

    this.state = state;
    this.checkBox = this.get('.checkbox');
    this.textField = this.get('.textField');
    this.text = this.get('.text');
    this.editButton = this.get('.editButton');

    this.isEditing = false;

  },

  events: {

    click: {
      editButton() {
        this.toggleEditMode();
      }
    },

    focusout: {
      textField() {
        if (this.isEditing) {
          this.leaveEditMode();
        }
      }
    },

    keydown: {
      textField(e) {
        if (this.isEditing && e.which === 13) {
          e.preventDefault();
          this.leaveEditMode();
        }
      }
    }

  },

  render: {

    isComplete(bool) {
      this.useClass('complete', bool);
      this.checkBox.useClass('checked', bool);
      this.editButton.useClass('disabled', bool);
      this.element.dataset.complete = bool;
    },

    selected(bool) {
      this.useClass('selected', bool);
    },

    text(content) {
      this.text.setText(content);
    },

    visible(bool) {
      this.useClass('hidden', !bool);
    }

  },

  toggleEditMode() {
    if (!this.isEditing) {
      this.enterEditMode();
    } else {
      this.leaveEditMode();
    }
  },

  enterEditMode() {

    this.isEditing = true;
    this.text.setAttr('contenteditable', 'true');
    this.editButton.setText('ok');
    this.textField.addClass('editing');

    const range = document.createRange();
    range.selectNodeContents(this.text.element);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

  },

  leaveEditMode() {

    this.text.setAttr('contenteditable', 'false');
    this.editButton.setText('edit');
    this.textField.removeClass('editing');

    this.state.text = this.text.getText();

    window.getSelection().removeAllRanges();

    setTimeout(() => {
      this.isEditing = false
    }, 100);

  }

});