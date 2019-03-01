Cue.UI('Todo-Container', Component => ({

  element: (
    `<div class="container">
        <div class="header">
          <img class="logo" src="" alt="logo">
          <h1 class="headline"></h1>
        </div>
        <div class="editorContainer"></div>
        <div class="footer">
          <p class="author"></p>
          <p class="info"></p>
        </div>
     </div>`
  ),

  styles: {

    '*': {
      boxSizing: 'border-box'
    },

    container: {
      position: 'relative',
      boxSizing: 'border-box',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: '5.5em',
      fontFamily: 'Roboto, sans-serif',
      color: 'rgb(232,235,238)',
      backgroundColor: 'rgb(22,25,28)',
      backgroundImage: 'url(assets/todo_bg.svg)',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      userSelect: 'none',
      '&::before': {
        content: '',
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        transform: 'translateY(0)',
        backgroundImage: 'url(assets/drawkit-list-app-colour.svg)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: '100% 105%',
        backgroundSize: '22%',
        transition: 'transform 250ms ease-in-out'
      },
      '&::after': {
        content: '',
        position: 'absolute',
        zIndex: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        opacity: 0,
        transition: 'opacity 250ms',
        backgroundImage: 'url(assets/todo_empty.svg)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '500px',
        backgroundPosition: '55% 50%'
      },
      '&.empty': {
        '&::before': {
          transform: 'translateY(100%)'
        },
        '&::after': {
          opacity: 1
        }
      }
    },

    header: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },

    logo: {
      width: '4.5em',
      height: '4.5em',
      marginRight: '1em'
    },

    editorContainer: {
      position: 'relative',
      zIndex: 1,
      width: '650px',
      maxWidth: '95%',
      boxShadow: 'none'
    },

    footer: {
      marginTop: 'auto',
      marginBottom: '1em',
      fontSize: '0.85em',
      opacity: 0.5,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',

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

    this.select('.logo').src = state.logo;
    this.select('.headline').textContent = state.title;
    this.select('.author').textContent = `Written by ${state.author}`;
    this.select('.info').textContent = state.footer;
    this.select('.editorContainer').appendChild(this.Editor(state.editor));

  },

  render: {
    hasTodos(itDoes) {
      if (itDoes) {
        this.removeClass('empty');
      } else {
        this.addClass('empty');
      }
    }
  }

}));