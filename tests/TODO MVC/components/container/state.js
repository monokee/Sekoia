Cue.State('Todo-Container', Module => ({

  props: {
    title: 'Cue TODO MVC',
    author: 'monokee',
    editor: {}
  },

  imports: {
    Editor: Module.import('Todo-Editor')
  },

  initialize(props) {
    this.title = props.title;
    this.author = props.author;
    this.editor = this.imports.Editor(props.editor);
  }

}));