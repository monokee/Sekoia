
document.addEventListener('DOMContentLoaded', () => {

  const CUE_TODOS = 'cue-todos';

  const app = Cue({
    state: 'Todo-Container',
    ui: 'Todo-Container'
  });

  let snapshot = {
    title: 'Cue.js TODO',
    author: 'monokee',
    editor: {
      filter: 'all',
      todos: [
        {isComplete: false, text: 'I am a Todo item!'}
      ]
    }
  };

  if (localStorage) {

    snapshot = JSON.parse(localStorage.getItem(CUE_TODOS)) || snapshot;

    Cue.on('save-todos', todos => {
      localStorage.setItem(CUE_TODOS, JSON.stringify(todos));
    });

  }

  app.mount(document.body, snapshot);

});