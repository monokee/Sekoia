Cue.State('Todo-Editor', Module => ({

  props: {
    filter: 'all',
    todos: [],
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
    visibleTodos({todos, active, completed, filter}) {
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