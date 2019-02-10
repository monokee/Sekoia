Cue.State('Todo-Container', Module => ({

  props: {
    title: 'Cue TODO MVC',
    author: 'monokee',
    editor: null
  },

  imports: {
    createEditor: Module.import('Todo-Editor')
  },

  initialize(props) {

    this.title = props.title || this.title;
    this.author = props.author || this.author;

    this.editor = this.imports.createEditor(props.editor);

  }

}));