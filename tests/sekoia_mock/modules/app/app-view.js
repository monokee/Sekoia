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

  initialize(state) {
    this.state = state;
    const {viewer, bottom} = this.refs();
    this.bottom = bottom;
    this.viewer = viewer;
  },

  bindEvents: {
    click: {
      '.myButton'(e) {
        Cue.trigger('logRootState', this.state.get());
      }
    },
    mousedown: {
      '.sectionMid'(e) {
        this.md = e.which === 1;
      }
    },
    mousemove: {
      '.sectionMid'(e) {
        if (!this.md) return;
        this.state.children[0].x = e.clientX;
        this.state.children[0].y = e.clientY;
      }
    },
    mouseup(e) {
      console.log(this.state);
      if (e.which === 1) {
        this.md = false;
      }
    }
  },

  renderState: {

    name(o) {
      this.bottom.textContent = o.value;
    },

    children(o) {
      if (o.value.length) {
        console.log('render:children', o.value);
        this.viewer.textContent = `Some child's data has changed! PositionAndName: ${o.value[0].positionAndName}`;
      }
    }

  }

}));