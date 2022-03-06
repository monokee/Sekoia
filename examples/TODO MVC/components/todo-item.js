import { defineComponent } from "../../../src/modules/component/define-component.js";

export const TodoItem = defineComponent('todo-item', {

  element: (`
    <div $="checkbox">
      <div class="bullet"></div>
      <div class="tick"></div>
      <div class="label"></div>
    </div>
    <input $="text" type="text">
    <div $="editButton">edit</div>
  `),

  style: (`
    $self {
      position: relative;
      overflow: hidden;
      width: 100%;
      flex: 0 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5em;
      background-color: #262b32;
      border-radius: 8px;
      border: 1px solid transparent;
      animation: splash 350ms normal forwards ease-in-out;
      animation-iteration-count: 1;
    }
    $self:first-child {
      
    }
    $self.selected {
      border-color: white;
    }
    $self::before {
      position: absolute;
      left: 0;
      z-index: 0;
      content: '';
      width: 100%;
      height: 100%;
      background-color: rgba(0, 255, 0, 0.1);
      opacity: 0;
      transition: opacity 350ms ease-in-out;
    }
    $self.complete::before {
      opacity: 1;
    }
    $text {
      position: relative;
      height: 100%;
      background: transparent;
      border: 0;
      outline: 0;
      color: inherit;
      pointer-events: none;
      opacity: 1;
      text-align: center;
      transition: opacity 250ms;
    }
    $text.editing {
      pointer-events: auto;
    }
    $text:focus {
      outline: 0;
      border: 0;
    }
    $self.complete $text {
      opacity: 0.65;
    }
    $editButton {
      position: relative;
      font-size: 0.7em;
      font-weight: bold;
      text-decoration: underline;
      opacity: 0.3;
      transition: opacity 150ms;
      cursor: pointer;
    }
    $self:hover $editButton,
    $self:hover $checkbox {
      opacity: 1;
    }
    $self.complete $editButton {
      opacity: 0;
      pointer-events: none;
    }
    $checkbox {
      position: relative;
      display: inline-block;
      width: var(--iconSize);
      height: var(--iconSize);
      line-height: var(--iconSize);
      cursor: pointer;
      opacity: 0.3;
      transition: opacity 150ms;
      --iconSize: 16px;
      --iconHalf: calc(var(--iconSize) / 2);
    }
    $checkbox .bullet,
    $checkbox .tick {
      position: absolute;
      width: var(--iconSize);
      height: var(--iconSize);
      border-radius: 50%;
    }
    $checkbox .bullet {
      border: 3px solid #99a3ac;
    }
    $checkbox .tick {
      background: #fff;
      opacity: 0;
      transform: scale(0.33);
      transition: opacity 150ms, transform 150ms;
    }
    $checkbox.checked .tick {
      opacity: 1;
      transform: scale(0.55);
    }
    $checkbox .label {
      margin-left: 24px;
      padding-left: 12px;
    }
    @keyframes splash {
      from {
        opacity: 0;
        transform: scale(0.5, 0.5);
      }
      to {
        opacity: 1;
        transform: scale(1, 1);
      }
    }
  `),
  
  state: {

    text: {
      value: '',
      render({$text}, value) {
        $text.value = value;
      }
    },
    
    complete: {
      value: false,
      render({$self, $checkbox, $editButton}, value) {
        $self.classList.toggle('complete', value);
        $checkbox.classList.toggle('checked', value);
        $editButton.classList.toggle('disabled', value);
        $self.setAttribute('data-complete', value);
      }
    },

    _selected: {
      value: false,
      render({$self}, value) {
        $self.classList.toggle('selected', value);
      }
    },

    _isEditing: {
      value: false,
      render({$self, $text, $editButton}, value) {
        $text.classList.toggle('editing', value);
        $editButton.textContent = value ? 'ok' : 'edit';
        if (value) {
          $text.focus();
          $text.select();
        } else {
          $text.blur();
        }
      }
    }
    
  },

  initialize({$checkbox, $editButton, $text}) {

    this.addEventListener('click', e => {

      e.stopPropagation();

      if ($checkbox.contains(e.target)) {

        const targetState = !this.state.get('complete');
        this.state.set('complete', targetState);

        // handle completion on parent controller
        this.dispatchEvent(new CustomEvent('todo-item::complete', {
          bubbles: true,
          detail: { targetState }
        }));

      } else if ($editButton.contains(e.target)) {

        this.state.set('_isEditing', !this.state.get('_isEditing'));

      } else if (!this.state.get('_isEditing')) {

        // handle selection on parent controller
        this.dispatchEvent(new CustomEvent('todo-item::selected', {
          bubbles: true,
          detail: { itemState: this.state, originalEvent: e }
        }));

      }

    });

    this.addEventListener('keyup', e => {
      if ($text.contains(e.target) && this.state.get('_isEditing')) {
        this.state.set('text', $text.value);
        if (e.key === 'Enter') {
          this.state.set('_isEditing', false);
        }
      }
    });

    this.addEventListener('focusout', e => {
      if ($text.contains(e.target) && this.state.get('_isEditing')) {
        this.state.set('_isEditing', false);
      }
    });

  }

});