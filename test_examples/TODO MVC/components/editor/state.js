Cue.State('Todo-Editor', Module => ({

  data: {
    todos: [],
    filter: 'all',
    active({todos}) {
      return todos.filter(item => !item.isComplete);
    },
    completed({todos}) {
      return todos.filter(item => item.isComplete);
    },
    activeCount({active}) {
      return active.length;
    },
    completedCount({completed}) {
      return completed.length;
    },
    selectedCount({todos}) {
      return todos.filter(item => item.selected).length;
    },
    visibleTodos({todos, active, completed, filter}) {

      let visible;

      if (filter === 'all') {
        visible = todos;
      } else if (filter === 'active') {
        visible = active;
      } else if (filter === 'completed') {
        visible = completed;
      }

      for (let i = 0; i < visible.length; i++) {
        visible[i].visible = true;
      }

      return visible;

    },
    hiddenTodos({todos, visibleTodos}) {

      const hidden = [];

      for (let i = 0, item; i < todos.length; i++) {
        item = todos[i];
        if (visibleTodos.indexOf(item) === -1) {
          item.visible = false;
          hidden.push(item);
        }
      }

      return hidden;

    }
  },

  imports: {
    TodoItem: Module.import('Todo-Item')
  },

  initialize({filter = this.filter, todos = this.todos}) {
    this.filter = filter;
    this.todos = todos.map(item => this.TodoItem(item));
  },

  addTodo(item) {
    this.todos.unshift(
      this.TodoItem(item)
    );
  },

  removeTodo(item) {
    const index = this.todos.indexOf(item);
    this.todos.splice(index, 1);
  },

  removeSelected() {
    const selected = this.todos.filter(item => item.selected);
    while(selected.length) {
      this.todos.splice(this.todos.indexOf(selected.pop()), 1);
    }
  },

  removeCompleted() {
    const completed = this.todos.filter(item => item.isComplete);
    while(completed.length) {
      this.todos.splice(this.todos.indexOf(completed.pop()), 1);
    }
  },

  selectTodo({mode, index}) {

    if (mode === 'radio') {

      this.visibleTodos.forEach((item, i) => {
        item.selected = i === index;
      });

    } else if (mode === 'meta') {

      this.visibleTodos[index].selected = !this.visibleTodos[index].selected;

    } else if (mode === 'range') {

      const selected = this.visibleTodos.filter(item => item.selected);
      const base = selected.length ? this.visibleTodos.indexOf(selected[selected.length - 1]) : index;

      this.deselectAll();

      const from = Math.min(index, base);
      const to = Math.max(index, base) + 1;

      for (let i = from; i < to; i++) {
        this.visibleTodos[i].selected = true;
      }

    }

  },

  selectAll() {
    this.visibleTodos.forEach(item => {
      item.selected = true;
    });
  },

  deselectAll() {
    this.visibleTodos.forEach(item => {
      item.selected = false
    });
  },

  toggleCompletion(index) {

    const item = this.visibleTodos[index];
    const targetState = !item.isComplete;

    item.isComplete = targetState;

    this.visibleTodos.forEach(sibling => {
      if (sibling.selected && sibling !== item) {
        sibling.isComplete = targetState;
      }
    });

  }

}));