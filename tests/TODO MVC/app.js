document.addEventListener('DOMContentLoaded', () => {

  const app = Cue({
    state: 'Todo-Container',
    ui: 'Todo-Container'
  });

  let snapshot = JSON.parse(localStorage.getItem('cue-todos')) || {
    title: '🧿 Cue Todo',
    author: 'monokee',
    editor: {
      filter: 'all',
      todos: []
    }
  };

  Cue.on('save-todos', todos => {
    localStorage.setItem('cue-todos', JSON.stringify(todos));
  });

  app.mount(document.body, snapshot);

});