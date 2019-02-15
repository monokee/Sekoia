Cue.UI('Todo-Editor', Component => ({

  template: (`
    <div class="editor">
      <input type="text" class="todoInput" placeholder="What needs to be done?">
      <div class="todoList"></div>
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

    a: {
      backgroundColor: 'blue'
    },

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
      borderTop: '1px solid rgb(62,65,68)',
      marginBottom: '1em',
      display: 'flex',
      flexDirection: 'column'
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
      borderBottom: '1px solid transparent',
      opacity: 0,
      transition: 'opacity 150ms',
      '&.visible': {
        opacity: 0.9
      },
      '&.visible:hover': {
        opacity: 0.75
      }
    }

  },

  imports: {
    createItem: Component.import('Todo-Item')
  },

  initialize(state) {

    if (state.type === 'a') {
      this.addClass('a')
    } else {
      this.addClass('b')
    }

    this.state = state;

    this.input = this.select('.todoInput');
    this.list = this.select('.todoList');
    this.itemCount = this.select('.itemCount');
    this.footer = this.select('.footer');

    this.filterButtons = {
      all: this.select('.filterButton--all'),
      active: this.select('.filterButton--active'),
      completed: this.select('.filterButton--completed')
    };

  },

  bindEvents: {

    keydown: {
      '.todoInput'(e) {
        if (e.which === 13 && this.input.value) {
          this.state.addTodo({
            isComplete: false,
            text: this.input.value
          });
          this.input.value = '';
        }
      }

    },

    click: {
      '.filterButton'(e) {
        this.state.filter = e.target.dataset.type;
      }
    }

  },

  renderState: {

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

    visibleTodos(todoArray) {

      if(todoArray.length === 0) {
        this.addClass(this.footer, 'hidden');
      } else {
        this.removeClass(this.footer, 'hidden');
      }

      this.list.textContent = '';

      todoArray.forEach(item => {
        this.list.appendChild(this.imports.createItem(item));
      });

    }

  }

}));