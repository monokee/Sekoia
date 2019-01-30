Cue.UI('App-UI', Component => ({

  template: (
    `<div id="app" class="app">
       <div ref="top" class="sectionTop"></div>
       <div class="sectionMid">
         <div class="sidebarRight"></div>
         <div ref ="viewer" class="viewerSection"></div>
         <div class="sidebarLeft"></div>
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
      '&.disabled': { // TODO: allow for scss syntax here. if property is an object, go into sass nesting mode. if first character is "&" chain onto parent selector. else space-append to parent selector.

      },
      '&:hover': {
        boxSizing: 'border-box'
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
      border: '1px solid #ebebeb'
    },

    sectionBottom: {
      width: '100%',
      height: '260px',
      border: '1px solid rgb(0, 140, 255)'
    }

  },

  imports: {
    //LeftMenu: Component.import('App.LeftMenu'),
    //Scopes: Component.import('Utils.ScopesView')
  },

  initialize(appState) {
    this.state = appState;
    const {viewer, bottom} = this.refs();
    this.viewer = viewer;
    this.bottom = bottom;
  },

  bindEvents: {
    contextmenu(e) {
      e.preventDefault();
      console.log('right clicked anywhere, default prevented.', e);
    },
    mousedown(e) {
      this.md = e.which === 1;
    },
    mousemove: {
      '.sectionMid'(e) {
        if (!this.md) return;
        this.state.x = e.clientX;
        this.state.y = e.clientY;
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
      this.bottom.textContent = o.value;
    },
    secondsPassed(o) {
      this.viewer.textContent = `Seconds passed (ticker): ${o.value}`;
    },
    position(o) {
      this.bottom.textContent = `Dragging: Top: ${o.value.top} | Left: ${o.value.left}`;
    }
  }

}));