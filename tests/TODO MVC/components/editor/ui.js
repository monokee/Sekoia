Cue.UI('Todo-Editor', Component => ({

  element: (`
    <div class="editor">
    
      <div class="confirmModal">
        <div class="message">This is a message from the regime. Are you sure you want to proceed?</div>
        <div class="buttonGroup">
          <div class="button button--cancel">Cancel</div>
          <div class="button button--delete">Delete</div>
        </div>
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
      maxHeight: '65vh',
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

    confirmModal: {
      position: 'absolute',
      zIndex: 2,
      width: '100%',
      height: '100%',
      background: 'rgba(12,15,18,0)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2em',
      pointerEvents: 'none',
      transition: 'background 150ms',

      '.buttonGroup, .message': {
        opacity: 0,
        transform: 'translateY(1.25em)',
        transitionProperty: 'opacity, transform',
        transitionDuration: '150ms',
        transitionTimingFunction: 'ease-in-out'
      },
      '.buttonGroup': {
        display: 'flex',
        marginTop: '1em'
      },
      '.button': {
        textAlign: 'center',
        borderRadius: '3px',
        fontSize: '0.85em',
        padding: '0.5em 1em',
        cursor: 'pointer',
        marginLeft: '0.75em'
      },
      '.button--cancel': {
        color: '#ebebeb',
      },
      '.button--delete': {
        color: '#fff',
        background: '#FF2D28'
      },

      '&.visible': {
        background: 'rgba(12,15,18,0.9)',
        pointerEvents: 'auto',

        '.buttonGroup, .message': {
          opacity: 1,
          transform: 'translateY(0)'
        }
      }

    },

    footer: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: '1em 0',
      borderTop: '1px solid rgb(62,65,68)',
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
    this.listItems = this.list.children;
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
        }
      }
    },

    click: {
      todoList(e) {
        e.stopPropagation();
        const el = e.target;
        const item = el.closest('.todoItem');
        const index = this.index(item);
        if (el.closest('.todoCheckbox')) {
          this.state.toggleCompletion(index);
        } else if (!(!!el.closest('.todoEditButton') || !!el.closest('.todoTextField.editing'))) {
          const mode = e.shiftKey ? 'range' : (e.metaKey || e.ctrlKey) ? 'meta' : 'radio';
          this.state.selectTodo({mode, index});
        }
      },
      filterButton(e) {
        this.state.filter = e.target.dataset.type;
      },
      clearButton(e) {

        const completedItems = [];

        for (const item of this.listItems) {
          if (item.dataset.complete === 'true') {
            completedItems.push(item);
            //TODO: transform scaleY item and transform: translateY next elements into previous position. then listen for css transition end and remove all of the elements. after the removal, reset transforms. wrap into a cool generic method.
          }
        }

        console.warn('todo - not implemented.')

        //this.state.removeCompleted();

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

    visibleTodos(todoArray) {
      this.setChildren(this.list, todoArray, this.imports.TodoItem);
    }

  }

}));