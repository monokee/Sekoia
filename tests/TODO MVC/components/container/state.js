Cue.State('Todo-Container', Module => ({

  data: {
    title: 'My App',
    logo: '',
    author: 'Captain Anonymous',
    footer: 'Not part of TODO MVC',
    editor: {},
    hasTodos({editor}) {
      return !!(editor && editor.todos && editor.todos.length > 0);
    }
  },

  imports: {
    Editor: Module.import('Todo-Editor')
  },

  initialize(props) {
    this.title = props.title || this.title;
    this.logo = props.logo || this.logo;
    this.author = props.author || this.author;
    this.footer = props.footer || this.footer;
    this.editor = this.Editor(props.editor);
  }

}));