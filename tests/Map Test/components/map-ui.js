Cue.UI('map-ui', Component => ({

  imports: {
    FriendView: Component.import('friend-ui')
  },

  template: (
    `<div class="yamContainer">
       <div class="mapContainer"></div>
       <div class="friendList"></div>
     </div>`
  ),

  styles: {
    yamContainer: {
      position: 'relative',
      width: '100vw',
      height: '100vh',
      fontFamily: 'Roboto, sans-serif',
      color: 'rgb(12,15,18)'
    },
    mapContainer: {
      position: 'relative',
      width: '100%',
      height: '100%',
      transition: 'filter 200ms',
      '&.blurred': {
        filter: 'blur(20px)'
      }
    },
    friendList: {
      position: 'absolute',
      width: '100%',
      height: '420px',
      bottom: 0,
      background: 'rgba(232,235,238,0.4)',
      display: 'flex',
      alignItem: 'center',
      justifyContent: 'center',
      padding: '2.5em',
      backdropFilter: 'blur(15px)'
    }
  },

  initialize(state) {
    this.state = state;
    this.mapContainer = this.select('.mapContainer');
    this.map = new google.maps.Map(this.mapContainer, this.state.map);
    this.yamyam = new google.maps.Marker({
      map: this.map,
      position: this.state.map.center
    });
    this.friendList = this.select('.friendList');

    Cue.on('blur-map', () => {
      this.toggleClass(this.mapContainer, 'blurred');
    });

  },

  renderState: {
    friends(array) {
      array.forEach(friend => this.friendList.appendChild(this.imports.FriendView(friend)));
    }
  }

}));