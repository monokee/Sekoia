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
            <div class="date"></div>
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
      padding: '1.5em',
      margin: '0.85em 0 0',
      background: '#13161A',
      opacity: 0.9,
      borderRadius: '5px',
      boxShadow: '0px 4px 5px 0px rgba(0,0,0,0.25)',
      cursor: 'default',
      transition: 'opacity 150ms',
      '&:hover': {
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
        padding: '0, 1em',
        textAlign: 'center',

        div: {
          transition: 'opacity 150ms'
        },

        '.text': {
          position: 'relative',
          height: '100%'
        },

        '.text::after': {
          position: 'absolute',
          content: '',
          display: 'block',
          width: '120%',
          height: '2px',
          left: '-10%',
          top: '50%',
          backgroundColor: 'rgb(0,115,255)',
          transformOrigin: 'left',
          transform: 'scaleX(0)',
          transition: 'transform 250ms ease-in-out'
        }

      },

      '.date': {
        fontSize: '0.7em',
        opacity: 0.65
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

        '.textField div': {
          opacity: 0.5
        },

        '.text::after': {
          transform: 'scaleX(1)'
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

        '.tick': {
          opacity: 1,
          transform: 'scale(0.55)'
        }

      },

      '.bullet': {
        position: 'absolute',
        width: 'var(--iconSize)',
        height: 'var(--iconSize)',
        borderRadius: '50%',
        border: '3px solid #98a3ac',
        boxSizing: 'border-box'
      },

      '.tick': {
        position: 'absolute',
        width: 'var(--iconSize)',
        height: 'var(--iconSize)',
        borderRadius: '50%',
        background: '#fff',
        opacity: 0,
        transform: 'scale(0.33)',
        transition: 'opacity 150ms, transform 150ms'
      },

      '.label': {
        marginLeft: '24px',
        paddingLeft: '12px'
      }
    },

  },

  initialize(state) {

    this.state = state;
    this.checkBox = this.select('.checkbox');
    this.textField = this.select('.textField');
    this.text = this.select('.text');
    this.editButton = this.select('.editButton');

    this.isEditing = false;

  },

  events: {

    click: {
      editButton() {
        if (!this.isEditing) {
          this.enterEditMode();
        } else {
          this.leaveEditMode();
        }
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

    isComplete(itIs) {
      if (itIs) {
        this.addClass('complete');
        this.addClass(this.checkBox, 'checked');
        this.addClass(this.editButton, 'disabled');
        this.element.dataset.complete = 'true';
      } else {
        this.removeClass('complete');
        this.removeClass(this.checkBox, 'checked');
        this.removeClass(this.editButton, 'disabled');
        this.element.dataset.complete = 'false';
      }
    },

    selected(itIs) {
      if (itIs) {
        this.addClass('selected');
      } else {
        this.removeClass('selected');
      }
    },

    text(content) {
      this.text.textContent = content;
    },

    visible(itIs) {
      if (itIs) {
        this.removeClass('hidden');
      } else {
        this.addClass('hidden');
      }
    }

  },

  enterEditMode() {

    this.isEditing = true;
    this.text.setAttribute('contenteditable', 'true');
    this.editButton.textContent = 'ok';

    this.addClass(this.textField, 'editing');

    const range = document.createRange();
    range.selectNodeContents(this.text);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

  },

  leaveEditMode() {

    this.text.setAttribute('contenteditable', 'false');
    this.editButton.textContent = 'edit';

    this.removeClass(this.textField, 'editing');

    this.state.text = this.text.textContent;

    window.getSelection().removeAllRanges();

    setTimeout(() => {
      this.isEditing = false
    }, 100);

  }

});