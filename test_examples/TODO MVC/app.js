document.addEventListener('DOMContentLoaded', () => {

  const app = Cue({
    state: 'Todo-Container',
    ui: 'Todo-Container'
  });

  app.mount(document.body, {
    title: 'Cue Todo',
    logo: 'assets/CueLogo__main.svg',
    author: 'monokee',
    footer: 'Character illustration by drawkit.io',
    editor: JSON.parse(localStorage.getItem('cue-todos')) || {
      filter: 'all',
      todos: []
    }
  });

  Cue.on('save-todos', todos => localStorage.setItem('cue-todos', JSON.stringify(todos)));

});