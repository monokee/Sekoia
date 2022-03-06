import { defineComponent } from "../../../src/modules/component/define-component.js";
import { ReactiveArray } from "../../../src/modules/store/ReactiveArray.js";
import { TodoItem } from "./todo-item.js";

export const TodoEditor = defineComponent('todo-editor', {

  element: (`
    <div class="input-wrapper">
      <input $="input" type="text" placeholder="What needs to be done?">
      <div $="submitButton">+</div>
    </div>
    <div $="list" tabindex="0"></div>
    <div class="footer">
      <div $="count"></div>
      <div $="history">
        <div data-action="undo">Undo</div>
        <div data-action="redo">Redo</div>
      </div>
    </div>
  `),

  style: (`
    $self {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .input-wrapper {
      width: 100%;
      height: 54px;
      display: flex;
      align-items: center;
    }
    $input {
      height: 100%;
      flex: 1 1 auto;
      padding: 0 0.5em;
      outline: 0;
      border: 0;
      color: white;
      background: transparent;
    }
    $input:focus {
      border: 0;
      outline: 0;
    }
    $submitButton {
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: white;
      background: rgb(0, 115, 255);
      cursor: pointer;
      transform: scale(0);
      pointer-events: none;
      transition: transform 250ms ease-in-out;
    }
    $submitButton.visible {
      transform: scale(1);
      pointer-events: auto;
    }
    $list {
      height: 60vh;
      overflow-y: overlay;
      border-top: 1px solid rgb(62,65,68);
      margin-bottom: 1em;
      display: flex;
      flex-direction: column;
      padding: 0.5em 0;
      gap: 0.5em;
    }
    $list:empty {
      background-image: url("components/placeholder.svg");
      background-size: max(65%, 10em);
      background-position: center;
      background-repeat: no-repeat;
    }
    $list:focus {
      border: 0;
      border-top: 1px solid rgb(62,65,68);
      outline: 0;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      padding: 1em 0;
      border-top: 1px solid rgb(62,65,68);
    }
    $history {
      display: flex;
      gap: 1em;
    }
    $history [data-action] {
      cursor: pointer;
      pointer-events: none;
      opacity: 0.5;
      transition: opacity 250ms ease-in-out;
    }
    $history [data-action].enabled {
      pointer-events: auto;
      opacity: 1;
    }
  `),

  state: {

    items: {
      value: new ReactiveArray([], {
        model: data => TodoItem.state(data)
      }),
      renderList: {
        parentElement: '$list',
        createChild: data => TodoItem.render({state: data})
      }
    },

    _text: {
      value: '',
      render({$input, $submitButton}, value) {
        $input.value = value;
        $submitButton.classList.toggle('visible', !!value);
      }
    },

    _count: {
      value: ({items}) => items.filter(item => !item.get('complete')).length,
      render({$count}, value) {
        $count.textContent = `${value} thing${value === 1 ? '' : 's'} to do...`;
      }
    },

    _historyState: {
      value: { undo: false, redo: false },
      render({$history}, value) {
        $history.firstElementChild.classList.toggle('enabled', value.undo);
        $history.lastElementChild.classList.toggle('enabled', value.redo);
      }
    }

  },

  initialize({$input, $submitButton, $list, $history}) {

    this.state.track('items', {
      maxEntries: 100,
      throttle: 2000,
      onTrack: (value, index, total) => {
        this.state.set('_historyState', {
          undo: index > 0,
          redo: index + 1 < total
        })
      }
    });

    $history.addEventListener('click', e => {
      if (e.target.matches('[data-action="undo"]')) {
        this.state.undo('items');
      } else if (e.target.matches('[data-action="redo"]')) {
        this.state.redo('items');
      }
    });

    document.addEventListener('click', e => {
      if ($submitButton.contains(e.target)) {
        this.addTodoItem($list);
      }
      this.state.get('items').forEach(item => item.set('_selected', false));
    });

    this.addEventListener('todo-item::selected', e => {
      this.handleItemSelection(e.detail.itemState, e.detail.originalEvent);
    });

    this.addEventListener('todo-item::complete', e => {
      this.state.get('items').forEach(item => {
        if (item.get('_selected')) {
          item.set('complete', e.detail.targetState);
        }
      });
    });

    $input.addEventListener('input', () => {
      this.state.set('_text', $input.value.trim());
    });

    $input.addEventListener('keyup', e => {
      if (e.key === 'Enter') {
        this.addTodoItem($list);
      }
    });

    $list.addEventListener('keyup', e => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        this.state.get('items').filterInPlace(item => item.get('_isEditing') || !item.get('_selected'));
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        this.state.get('items').forEach(item => {
          item.set('_selected', true);
        });
      }
    });

  },

  addTodoItem() {

    const text = this.state.get('_text');

    if (text.startsWith('many')) {

      const num = 500;

      this.state.get('items').set(new Array(num).fill(null).map((x, i) => ({
        text: `Item ${i + 1}/${num}`
      })));

    } else if (text) {

      this.state.get('items').unshift({ text });

    }

    this.state.set('_text', '');

  },

  handleItemSelection(itemState, originalEvent) {

    const items = this.state.get('items');
    const index = items.indexOf(itemState);

    if (originalEvent.shiftKey) {

      const base = Math.max(0, items.findLastIndex(item => item.get('_selected')));
      const from = Math.min(index, base);
      const to = Math.max(index, base) + 1;
      items.forEach((item, i) => item.set('_selected', i >= from && i < to));

    } else if (originalEvent.metaKey || originalEvent.ctrlKey) {

      itemState.set('_selected', !itemState.get('_selected'));

    } else {

      items.forEach((item, i) => {
        item.set('_selected', i === index);
      });

    }

  }

});