Cue.State('Todo-Container', Module => ({

  props: {
    title: 'Cue TODO MVC',
    author: 'monokee',
    time: new Date().toString(),
    greetAuthor({time, author}) {
      if (time < '12000') {
        return `Good Morning, ${author}!`;
      } else {
        return `Good Afternood, ${author}!`;
      }
    },
    fullText({greetAuthor}) {

    },
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