Cue.UI('Todo-Editor', Component => ({

  element: (`
    <div class="editor">   
      <div class="buttonGroup">
        <div class="button add1k">+1k</div>
        <div class="button save">Save</div>
      </div>
      <input $input type="text" class="todoInput" placeholder="What needs to be done?">
      <div $list class="todoList" tabindex="0"></div>
      <div $footer class="footer">
        <div $itemcount class="itemCount"></div>
        <div class="filterButtons">
           <div $filter_all class="filterButton" data-type="all">All</div>
           <div $filter_active class="filterButton" data-type="active">Active</div>
           <div $filter_completed class="filterButton" data-type="completed">Completed</div>
        </div>
        <div $clearbutton class="clearButton">Clear Completed</div>
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
  },

  events: {

    keydown: {
      todoInput(e) {
        if (e.which === 13 && this.$input.element.value) {
          this.state.addTodo({
            isComplete: false,
            text: this.$input.element.value
          });
          this.$input.element.value = '';
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
        const index = this.getIndex(item);
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
      clearButton() {
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
    },

    focusout: {
      todoList() {
        this.state.deselectAll();
      }
    }

  },

  render: {
    $filter_all: {
      filter(ref, type) {
        ref.useClass('active', type === 'all');
      }
    },
    $filter_active: {
      filter(ref, type) {
        ref.useClass('active', type === 'active');
      }
    },
    $filter_completed: {
      filter(ref, type) {
        ref.useClass('active', type === 'completed');
      }
    },
    $itemcount: {
      activeCount(ref, number) {
        ref.setText(`${number} ${number === 1 ? 'item' : 'items'} left`);
      }
    },
    $clearbutton: {
      completedCount(ref, number) {
        ref.useClass('visible', number > 0);
      }
    },
    $list: {
      todos(ref, todoArray) {
        ref.setChildren(todoArray, this.TodoItem);
      }
    },
    $footer: {
      todos(ref, todoArray) {
        ref.useClass('hidden', todoArray.length === 0);
      }
    }
  }

}));