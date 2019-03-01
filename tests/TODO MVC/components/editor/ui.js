Cue.UI('Todo-Editor', Component => ({

  element: (`
    <div class="editor">
          
      <div class="buttonGroup">
        <div class="button add1k">+1k</div>
        <div class="button save">Save</div>
      </div>
      
      <input type="text" class="todoInput" placeholder="What needs to be done?">
      
      <div class="todoList" tabindex="0"></div>
      
      <div class="footer">
        <div class="itemCount"></div>
        <div class="filterButtons">
           <div class="filterButton filterButton--all" data-type="all">All</div>
           <div class="filterButton filterButton--active" data-type="active">Active</div>
           <div class="filterButton filterButton--completed" data-type="completed">Completed</div>
        </div>
        <div class="clearButton">Clear Completed</div>
      </div>
      
    </div>
  `),

  styles: {

    editor: {
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    },

    buttonGroup: {
      alignSelf: 'flex-end',
      position: 'relative',
      display: 'flex',
      marginBottom: '1em'
    },

    button: {
      borderRadius: '3px',
      fontSize: '0.85em',
      padding: '0.5em 1em',
      borderBottom: '1px solid transparent',
      cursor: 'pointer',
      marginLeft: '0.7em',
      '&.save': {
        background: 'rgb(0,115,255)'
      }
    },

    todoInput: {
      width: '100%',
      height: '54px',
      boxSizing: 'border-box',
      borderRadius: '3px',
      padding: '0 0.5em',
      outline: 0,
      border: 'none',
      '&:focus': {
        border: 'none',
        outline: 0
      }
    },

    todoList: {
      maxHeight: '60vh',
      overflowY: 'overlay',
      borderTop: '1px solid rgb(62,65,68)',
      marginBottom: '1em',
      display: 'flex',
      flexDirection: 'column',
      outline: 0,
      border: 'none',
      '&:focus': {
        outline: 0,
        border: 'none'
      }
    },

    footer: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: '1em 0',
      borderTop: '1px solid rgb(62,65,68)',
      transformOrigin: 'top',
      transform: 'scaleY(1)',
      transition: 'transform 150ms ease-in-out',
      '&.hidden': {
        transform: 'scaleY(0)'
      }
    },

    itemCount: {
      borderBottom: '1px solid transparent'
    },

    filterButtons: {
      display: 'flex',
      margin: '0 0.5em'
    },

    filterButton: {
      margin: '0 0.5em',
      cursor: 'pointer',
      borderBottom: '1px solid transparent',
      opacity: 0.9,
      transition: 'opacity 150ms',
      '&:hover': {
        opacity: 0.75
      },
      '&.active': {
        opacity: 1,
        color: '#fff',
        borderBottom: '1px solid rgb(0,115,255)'
      }
    },

    clearButton: {
      background: '#FF2D28',
      color: '#fff',
      borderRadius: '3px',
      fontSize: '0.85em',
      padding: '0.5em 1em',
      borderBottom: '1px solid transparent',
      opacity: 0,
      transition: 'opacity 150ms',
      cursor: 'pointer',
      pointerEvents: 'none',
      '&.visible': {
        opacity: 0.9,
        pointerEvents: 'auto'
      },
      '&.visible:hover': {
        opacity: 0.75
      }
    }

  },

  imports: {
    TodoItem: Component.import('Todo-Item')
  },

  initialize(state) {

    this.state = state;

    this.input = this.select('.todoInput');
    this.list = this.select('.todoList');
    this.itemCount = this.select('.itemCount');
    this.footer = this.select('.footer');
    this.clearButton = this.select('.clearButton');

    this.filterButtons = {
      all: this.select('.filterButton--all'),
      active: this.select('.filterButton--active'),
      completed: this.select('.filterButton--completed')
    };

  },

  events: {

    keydown: {
      todoInput(e) {
        if (e.which === 13 && this.input.value) {
          this.state.addTodo({
            isComplete: false,
            text: this.input.value
          });
          this.input.value = '';
        }
      },
      todoList(e) {
        if (e.which === 46 || e.which === 8) {
          this.state.removeSelected();
        } else if ((e.ctrlKey || e.metaKey) && (e.which === 65 || e.which === 97) ) {
          this.state.selectAll();
        }
      }
    },

    click: {
      todoList(e) {
        e.stopImmediatePropagation();
        const el = e.target;
        const item = el.closest('.Todo-Item-item');
        const index = this.index(item);
        if (el.closest('.Todo-Item-checkbox')) {
          this.state.toggleCompletion(index);
        } else if (!el.closest('.editButton') && !el.closest('.textField.editing')) {
          const mode = e.shiftKey ? 'range' : (e.metaKey || e.ctrlKey) ? 'meta' : 'radio';
          this.state.selectTodo({mode, index});
        }
      },
      filterButton(e) {
        this.state.filter = e.target.dataset.type;
      },
      clearButton(e) {
        this.state.removeCompleted();
      },
      add1k() {
        for (let i = 0; i < 1000; i++) {
          this.state.addTodo({
            isComplete: false,
            text: `Random Todo ${Math.random().toFixed(4)}...`
          });
        }
      },
      save() {
        Cue.trigger('save-todos', this.state);
      }
    }

  },

  render: {

    filter(type) {
      for (const button in this.filterButtons) {
        if (button !== type) {
          this.removeClass(this.filterButtons[button], 'active');
        } else {
          this.addClass(this.filterButtons[button], 'active');
        }
      }
    },

    activeCount(number) {
      this.itemCount.textContent = `${number} ${number === 1 ? 'item' : 'items'} left`;
    },

    completedCount(number) {
      if (number > 0) {
        this.addClass(this.clearButton, 'visible');
      } else {
        this.removeClass(this.clearButton, 'visible');
      }
    },

    selectedCount(number) {
      if (number > 0) {
        document.addEventListener('click', () => {
          this.state.deselectAll();
        }, {once: true});
      }
    },

    todos(todoArray) {
      this.setChildren(this.list, todoArray, this.TodoItem);

      if (todoArray.length === 0) {
        this.addClass(this.footer, 'hidden');
      } else {
        this.removeClass(this.footer, 'hidden');
      }

    },

    visibleTodos(todoArray) {
      todoArray.forEach(item => {
        item.visible = true;
      });
    },

    hiddenTodos(todoArray) {
      todoArray.forEach(item => {
        item.visible = false;
      });
    }

  }

}));