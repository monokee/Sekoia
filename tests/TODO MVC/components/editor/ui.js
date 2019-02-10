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
      '&:focus': {
        border: 'none',
        outline: 'none'
      }
    },

    todoList: {
      borderTop: '1px solid rgb(62,65,68)',
      borderBottom: '1px solid rgb(62,65,68)',
      display: 'flex',
      flexDirection: 'column'
    },

    footer: {
      display: 'flex',
      alignItems: 'space-around',
      justifyContent: 'center'
    },

    filterButton: {
      margin: '0 0.5em',
      cursor: 'pointer',
      opacity: 0.9,
      transition: 'opacity 150ms',
      '&:hover': {
        opacity: 0.75
      },
      '&.active': {
        opacity: 1
      }
    },

    clearButton: {
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
        if (e.which === 13) {
          this.state.addTodo(this.input.value);
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

    filter(o) {
      for (const button in this.filterButtons) {
        if (button !== o.value) {
          this.removeClass(this.filterButtons[button], 'active');
        } else {
          this.removeClass(this.filterButtons[button], 'active');
        }
      }
    },

    activeCount(o) {
      this.itemCount.textContent = `${o.value} ${o.value === 1 ? 'item' : 'items'} left`;
    },

    todos(o) {

      if(o.value.length === 0) {
        this.addClass(this.footer, 'hidden');
      } else {
        this.removeClass(this.footer, 'hidden');
      }

      this.list.textContent = '';

      o.value.forEach(item => {
        this.list.appendChild(this.imports.createItem(item));
      });

      /*
      this.setChildren(this.list, {
        from: this.todoState,
        to: o.value,
        create: this.imports.createItem
      });

      this.todoState = o.value;
      */

    }

  }

}));