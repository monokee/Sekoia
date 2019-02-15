Cue.UI('friend-ui', Component => ({

  template: (
    `<div class="friend">
       <div class="friendPicture"></div>
       <div class="name"></div>
       <div class="birthday"></div>
     </div>`
  ),

  styles: {
    friend: {
      position: 'relative',
      flex: '0 0 auto',
      width: '350px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },

    friendPicture: {
      position: 'relative',
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      overflow: 'hidden',
      background: 'rgb(0,115,255)'
    }
  },

  initialize(state) {
    this.state = state;
    this.nameView = this.select('.name');
    this.birthdayView = this.select('.birthday');
  },

  renderState: {
    fullName(name) {
      this.nameView.textContent = name;
    },
    birthday(date) {
      this.birthdayView.textContent = date;
    }
  },

  bindEvents: {
    click: {
      '.friendPicture'(e) {
        Cue.trigger('blur-map');
      }
    }
  }

}));