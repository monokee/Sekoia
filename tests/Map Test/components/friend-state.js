Cue.State('friend-state', Module => ({

  props: {
    firstName: '',
    lastName: '',
    birthday: '',
    fullName({firstName, lastName}) {
      return `${firstName} ${lastName}`;
    }
  },

  initialize(props) {
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.birthday = props.birthday;
  },

  changeFirstName(text) {
    this.firstName = text.trim();
  }

}));