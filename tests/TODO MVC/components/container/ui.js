Cue.UI('Todo-Container', Component => ({

  element: (
    `<div class="container">
        <h1 class="headline"></h1>
        <button class="add10k">Add 10.000 Random Todos</button>
        <div class="editorContainer"></div>
        <div class="footer">
          <p>Written by monokee</p>
          <p>Not part of TodoMVC</p>
        </div>
     </div>`
  ),

  styles: {

    '*': {
      boxSizing: 'border-box'
    },

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
      userSelect     : 'none'
    },

    title: {
      margin   : '1em 0',
      color    : 'rgb(0,115,255)',
      fontSize : '3.5em',
      textAlign: 'center'
    },

    editorContainer: {
      width    : '650px',
      maxWidth : '95%',
      boxShadow: 'none'
    },

    footer: {
      display       : 'flex',
      flexDirection : 'column',
      alignItems    : 'center',
      justifyContent: 'center',
      marginTop     : '2.5em',

      p: {
        margin: 0
      }

    }

  },

  imports: {
    Editor: Component.import('Todo-Editor')
  },

  initialize(state) {

    this.state = state;

    this.headline = this.select('.headline');
    this.headline.textContent = state.title;

    this.editorContainer = this.select('.editorContainer');
    this.editorContainer.appendChild(this.Editor(state.editor));

  },

  events: {
    click: {
      add10k() {
        for (let i = 0; i < 1000; i++) {
          this.state.editor.addTodo({
            isComplete: false,
            text: `Random Todo ${Math.random().toFixed(4)}...`
          });
        }
      }
    }
  }

}));