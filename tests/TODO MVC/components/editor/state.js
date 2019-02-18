Cue.State('Todo-Editor', Module => ({

  props: {
    todos: [],
    filter: 'all',
    active({todos}) {
      console.log('%c [recompute] active', 'background: beige; color: orange;');
      return todos.filter(item => !item.isComplete);
    },
    visibleTodos({todos, active, completed, filter}) {
      console.log('%c [recompute] visibleTodos', 'background: beige; color: blue;');
      switch (filter) {
        case 'all': return todos;
        case 'active': return active;
        case 'completed': return completed;
      }
    },
    completed({todos}) {
      console.log('%c [recompute] completed', 'background: beige; color: darkOrange;');
      return todos.filter(item => item.isComplete);
    },
    activeCount({active}) {
      console.log('%c [recompute] activeCount', 'background: beige; color: red;');
      return active.length;
    },
    completedCount({completed}) {
      console.log('%c [recompute] completedCount', 'background: beige; color: darkRed;');
      return completed.length;
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