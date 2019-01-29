Cue.UI('App-UI', Component => ({

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

    this.state = appState;
    const {top, bottom} = this.getRefs();
    this.top = top;
    this.bottom = bottom;

  },

  onUserInput: {
    click: e => {
      this.state.startTicker();
    },
    contextMenu: e => {
      e.preventDefault();
      this.state.stopTicker();
    }
  },

  onStateChange: {
    name: o => {
      this.bottom.textContent = o.value;
    },
    secondsPassed: o => {
      //TODO: styles implementation as mapped classList won't work. the styles can target nested elements but the mapped classList only targets the root element. wtf?
      this.addClass('sectionTop');
      this.removeClass('sectionTop');
      this.toggleClass('someThing');
      this.toggleClass(this.bottom, 'someThingElse');

      if (o.value) {
        this.styles.remove('sectionTop');
      } else {
        this.styles.add('sectionTop');
      }

    }
  }

}));