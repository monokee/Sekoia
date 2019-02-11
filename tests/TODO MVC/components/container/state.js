Cue.State('Todo-Container', Module => ({

  props: {
    title: 'Cue TODO MVC',
    author: 'monokee',
    editor: null
  },

  imports: {
    Editor: Module.import('Todo-Editor')
  },

  initialize(props) {

    console.log('%c [Todo-Container](initialize)', 'background: cornsilk; color: chocolate;');

    this.title = props.title;
    this.author = props.author;
    this.editor = this.imports.Editor(props.editor);

  }

}));