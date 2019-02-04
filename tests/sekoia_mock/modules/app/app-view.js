Cue.UI('Root-UI', Component => ({

  template: (
    `<div id="app" class="app">
       <div ref="top" class="sectionTop"></div>
       <div class="sectionMid">
         <div class="sidebarRight"></div>
         <div ref ="viewer" class="viewerSection"></div>
         <div class="sidebarLeft">
            <button ref="myButton" class="myButton"></button>
         </div>
       </div>
       <div ref="bottom" class="sectionBottom"></div>
     </div>`
  ),

  styles: {

    app: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      flex: '0 1 auto',
      userSelect: 'none',
      boxSizing: 'borderBox',
      '&.disabled': {
        cursor: 'not-allowed'
      }
    },

    sectionTop: {
      width: '100%',
      height: '50px',
      flex: '0 0 auto',
      border: '1px solid grey'
    },

    sectionMid: {
      width: '100%',
      flex: '1 1 auto',
      border: '1px solid #ebebeb',
      '&:hover': {
        background: 'red'
      }
    },

    sectionBottom: {
      width: '100%',
      height: '260px',
      border: '1px solid rgb(0, 140, 255)'
    },

    myButton: {
      margin: 0,
      backgroundColor: 'rgb(0, 115, 255)',
      width: '420px',
      height: '52px',
      borderRadius: '500px',
      outline: 'none',
      border: 'none',
      '&:focus': {
        outline: 'none',
        border: 'none',
        backgroundColor: '#ffb400'
      }
    }

  },

  imports: {
    //mySubComponent: Component.import('MySubUIComponent'),
    //Scopes: Component.import('Utils.ScopesView')
  },

  initialize(state) {
    this.state = state;
    const {top, viewer, myButton, bottom} = this.refs();
    this.top = top;
    this.bottom = bottom;
    this.viewer = viewer;
    this.myButton = myButton;
  },

  bindEvents: {
    contextmenu(e) {
      e.preventDefault();
      this.state.child.disabled = !this.state.child.disabled;
    },
    mousedown: {
      '.sectionMid'(e) {
        this.md = e.which === 1;
      }
    },
    mousemove: {
      '.sectionMid'(e) {
        if (!this.md) return;
        this.state.child.x = e.clientX;
        this.state.child.y = e.clientY;
      }
    },
    mouseup(e) {
      if (e.which === 1) {
        this.md = false;
      }
    }
  },

  renderState: {

    name(o) {
      // TODO: the definition of this function triggers a GET on root which has the correct value. where is this bugggggggg
      console.log('renderState: name (likely on Root?)');
      this.bottom.textContent = o.value;
    },

    child(o) {
      this.viewer.textContent = `Child data has changed! PositionAndName: ${o.value.positionAndName}`;
    }

  }

}));