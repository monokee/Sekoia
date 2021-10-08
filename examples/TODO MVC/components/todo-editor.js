import { Component } from "../../../build/cue.module.js";

export const TodoEditor = Component.define('todo-editor', {

  element: (`
    <button $="add1k">Add 1k Entries</button>
    <input $="todoInput" type="text" placeholder="What needs to be done?">
    <div $="todoList" tabindex="0"></div>
    <footer $="footer">
      <div $="itemCount"></div>
      <div class="filter-buttons">
         <button data-type="all">All</button>
         <button data-type="active">Active</button>
         <button data-type="completed">Completed</button>
      </div>
      <button $="clearButton">Clear Completed</button>
    </footer>
  `),

  style: (`
    $self {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    button {
      webkit-appearance: none;
      border-radius: 3px;
      font-size: 0.85em;
      padding: 0.5em 1em;
      border-bottom: 1px solid transparent;
      cursor: pointer;
      margin-left: 0.7em;
    }
    $add1k {
      margin-left: auto;
      margin-bottom: 1em;
    }
    $todoInput {
      width: 100%;
      height: 54px;
      border-radius: 3px;
      padding: 0 0.5em;
      outline: 0;
      border: none;
    }
    $todoInput:focus {
      border: none;
      outline: 0;
    }
    $todoList {
      max-height: 60vh;
      overflow-y: overlay;
      border-top: 1px solid rgb(62,65,68);
      margin-bottom: 1em;
      display: flex;
      flex-direction: column;
      outline: 0;
      border: none;
    }
    $footer {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 1em 0;
      border-top: 1px solid rgb(62,65,68);
      transform-origin: top;
      transform: scaleY(1);
      transition: transform 150ms ease-in-out;
    }
    $footer.hidden {
      transform: scaleY(0);
    }
    $itemCount {
      border-bottom: 1px solid transparent;
    }
    .filter-buttons {
      display: flex;
      margin: 0 0.5em;
    }
    .filter-buttons button {
      margin: 0 0.5em;
      cursor: pointer;
      border-bottom: 1px solid transparent;
      opacity: 0.9;
      transition: opacity 150ms;
    }
    .filter-buttons button:hover {
      opacity: 0.75;
    }
    .filter-buttons button.active {
      opacity: 1;
      color: white;
      border-bottom: 1px solid rgb(0,115,255);
    }
    $clearButton {
      background: #FF2D28;
      color: white;
      border-radius: 3px;
      font-size: 0.85em;
      padding: 0.5em 1em;
      border-bottom: 1px solid transparent;
      opacity: 0;
      transition: opacity 150ms;
      cursor: pointer;
      pointer-events: none;
    }
    $clearButton.visible {
      opacity: 0.9;
      pointer-events: all;
    }
    $clearButton.visible:hover {
      opacity: 0.75;
    }
    
  `),

  data: {

  },

  initialize({$add1k, $todoInput, $todoList, }) {

    this.addEventListener('keyup', e => {

      if (e.target.contains($todoInput) && e.key === 'Enter' && $todoInput.value) {

        this.addTodo(false, $todoInput.value.trim());
        $todoInput.value = '';

      } else if (e.target.contains($todoList)) {

        if (e.key === 'Delete' || e.key === 'Backspace') {
          this.removeSelected();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === '1')) {
          this.selectAll();
        }

      }

    })

  },

  addTodo(isComplete, text) {

  },

  removeSelected() {

  },

  selectAll() {

  }

})