Cue.State('map-state', Module => ({

  imports: {
    Friend: Module.import('friend-state')
  },

  props: {
    map: {},
    friends: [],
    numberOfFriends({friends}) {
      return friends.length;
    }
  },

  initialize(props) {
    this.map = props.map;
    this.friends = props.friends.map(friendData => this.imports.Friend(friendData));
  }

}));