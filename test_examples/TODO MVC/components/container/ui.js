Cue.UI('Todo-Container', Component => ({

  element: (
    `<div $container class="container">
        <div class="header">
          <img $logo class="logo" src="" alt="logo">
          <h1 $title class="headline"></h1>
        </div>
        <div $editor class="editorContainer"></div>
        <div class="footer">
          <p $author class="author"></p>
          <p $info class="info"></p>
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
        backgroundSize: '25vmax',
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

    this.$logo.setAttr('src', state.logo);
    this.$title.setText(state.title);
    this.$author.setText(`Written by ${state.author}`);
    this.$info.setText(state.footer);
    this.$editor.append(this.Editor(state.editor));

  },

  render: {
    $container: {
      hasTodos(el, bool) {
        el.useClass('empty', !bool);
      }
    }
  }

}));