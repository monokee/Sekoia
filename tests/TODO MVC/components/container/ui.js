Cue.UI('Todo-Container', Component => ({

  template: (
    `<div class="container">
        <h1 class="headline"></h1>
        <div class="editorContainer"></div>
        <div class="footer">
          <p>Double-click to edit a todo</p>
          <p>Written by monokee</p>
          <p>Not part of TodoMVC</p>
        </div>
     </div>`
  ),

  styles: {

    container: {
      position       : 'relative',
      width          : '100vw',
      height         : '100vh',
      overflow       : 'hidden',
      display        : 'flex',
      flexDirection  : 'column',
      alignItems     : 'center',
      justifyContent : 'center',
      fontFamily     : 'Roboto, sans-serif',
      color          : 'rgb(232,235,238)',
      backgroundColor: 'rgb(22,25,28)',
    },

    title: {
      margin   : '1em 0',
      color    : 'rgb(0,115,255)',
      fontSize : '3.5em',
      textAlign: 'center'
    },

    editor: {
      width        : '500px',
      maxWidth     : '95%',
      boxShadow    : 'none'
    },

    footer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: '2.5em',

      p: {
        margin: 0
      }

    }

  },

  imports: {
    editor: Component.import('Todo-Editor')
  },

  initialize(state) {
    console.log('%c [Todo-Container](initialize)', 'background: lightcyan; color: dodgerblue;');
    this.state = state;
    this.createEditor = this.imports.editor;
    this.headline = this.select('.headline');
    this.editorContainer = this.select('.editorContainer');

  },

  renderState: {

    title(o) {
      this.headline.textContent = o.value;
    },

    editor(o) {
      this.editorContainer.appendChild(
        this.createEditor(o.value)
      );
    }

  }

}));