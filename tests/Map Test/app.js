
function initializeMapApplication() {

  const app = Cue({
    state: 'map-state',
    ui: 'map-ui'
  });

  app.mount(document.getElementById('app'), {
    map: {
      zoom: 200,
      center: {
        lat: 50.944096,
        lng: 6.955765
      }
    },
    friends: [
      {firstName: 'Dimi', lastName: 'Zaziki', birthday: '06. August'},
      {firstName: 'Jones', lastName: 'Walter', birthday: '01. Januar'},
      {firstName: 'Veysi', lastName: 'Yalcin', birthday: '01. August'}
    ]
  });

}