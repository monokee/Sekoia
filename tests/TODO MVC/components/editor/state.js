Cue.State('Todo-Editor', Module => ({

  props: {
    todos: [],
    filter: 'all',
    active({todos}) {
      console.trace('%c [recompute] active', 'background: beige; color: orange;');
      return todos.filter(item => !item.isComplete);
    },
    completed({todos}) {
      console.trace('%c [recompute] completed', 'background: beige; color: darkOrange;');
      return todos.filter(item => item.isComplete);
    },
    activeCount({active}) {
      console.trace('%c [recompute] activeCount', 'background: beige; color: red;');
      return active.length;
    },
    completedCount({completed}) {
      console.trace('%c [recompute] completedCount', 'background: beige; color: darkRed;');
      return completed.length;
    },
    visibleTodos({todos, active, completed, filter}) {
      console.trace('%c [recompute] visibleTodos', 'background: beige; color: blue;');
      switch (filter) {
        case 'all': return todos;
        case 'active': return active;
        case 'completed': return completed;
      }
    }
  },

  imports: {
    TodoItem: Module.import('Todo-Item')
  },

  initialize({filter = this.filter, todos = this.todos}) {
    this.filter = filter;
    this.todos = todos.map(item => this.imports.TodoItem(item));
  },

  addTodo(item) {
    this.todos.push(this.imports.TodoItem(item));
  }

}));