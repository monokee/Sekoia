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
    createItem: Module.import('Todo-Item')
  },

  initialize({filter = this.filter, todos = this.todos}) {

    console.log('%c [Todo-Editor](initialize)', 'background: cornsilk; color: chocolate;');

    this.filter = filter;

    // Set is always the last operation that will be called.
    //

    //         3      1                  2
    //       =set= [create]           {create}
    this.todos = todos.map(text => this.imports.createItem(text));
    // 1[create] -> this will be converted when SET is called on it. it will attempt to createState from all of its children (only type 2 needs to be converted though)
    // 2{create} -> will call createState -> this will create sub-states for all of its children (only type 2, type 1 has taken care of itself etc)
    // 3 =set=   -> will trigger 1[create].

    // nothing is mounted yet! we should only mount once an entire tree has been constructed. how can we know that this is true? this has to work dynamically ie not just for initial tree construction. (we might have to convert to new proxies after the first batch)


    console.log('Mapped Todos:', this.todos);

  },

  addTodo(text) {
    this.todos.push(this.imports.createItem(text));
  }

}));