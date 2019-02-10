Cue.State('Todo-Editor', Module => ({

  props: {
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
    visibleTodos({todos, active, completed, filter}) {
      switch (filter) {
        case 'all': return todos;
        case 'active': return active;
        case 'completed': return completed;
      }
    }
  },

  imports: {
    createItem: Module.import('Todo-Item')
  },

  initialize(props = {filter: 'all', todos: []}) {

    this.filter = props.filter;

    if (props.todos.length) {
      this.todos = props.todos.map(text => this.imports.createItem(text));
    }

  },

  addTodo(text) {
    console.log('addTodo', this);
    this.todos.push(this.imports.createItem(text));
  }

}));