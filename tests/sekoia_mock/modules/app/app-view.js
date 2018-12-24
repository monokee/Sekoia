Cue.Component('App', Module => ({

  template: {

    element: (
      `<div id="app" class="app">
         <div class="sectionTop"></div>
         <div class="sectionMid">
           <div class="sidebarRight"></div>
           <div class="viewerSection"></div>
           <div class="sidebarLeft"></div>
         </div>
         <div class="sectionBottom"></div>
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
        justifyContent: 'center',
      },

      sectionTop: {
        width: '100%',
        height: '50px',
        flex: '0 0 auto',
        border: '1px solid grey'
      },

      sectionMid: {
        width: '100%',
        flex: '0 1 auto',
        border: '1px solid #ebebeb'
      },

      sectionBottom: {
        width: '100%',
        height: '260px',
        border: '1px solid rgb(0, 140, 255)'
      }

    },

    //components: {}

  },

  initialize(appState) {



  }

}));