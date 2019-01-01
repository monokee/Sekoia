Cue.UI('App', Component => ({

  template: (
    `<div id="app" class="app">
       <div ref="top" class="sectionTop"></div>
       <div class="sectionMid">
         <div class="sidebarRight"></div>
         <div class="viewerSection"></div>
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
      flex: '0 1 auto'
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

    const element = this.element;
    const classList = element.classList;
    const {top, bottom} = this.getRefs();

    this.on({
      click: e => {
        appState.startTicker();
        console.log('ticker started!');
      },
      contextmenu: e => {
        e.preventDefault();
        console.log('right-click', e.target);
      },
      keyup: e => {
        console.log('keydown', e.which);
      }
    });

    this.observe(appState, {
      name(o) {
        bottom.textContent = o.value;
      },
      secondsPassed(o) {
        top.textContent = o.value;
      }
    });

  },

  didMount() {},

  didUpdate() {},

  willUnmount() {}

}));