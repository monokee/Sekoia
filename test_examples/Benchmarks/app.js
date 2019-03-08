
const WORDS = ["lit", "swaggy", "hot", "kinky", "dope", "sweet", "swell", "salty", "dirty", "huge", "disgusting", "horny", "perverted", "politically incorrect", "crazy", "swollen", "mushy", "weird fucking", "fucking", "satanic", "zappy", "raunchy", "cheap", "hella-cool", "twisted"];
const COLORS = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const NOUNS = ["monkey", "monk", "rabbi", "nerd", "dude", "chick", "student", "teacher", "plastic bag", "burger", "pizza", "mouse", "sextoy"];

const random = max => Math.round(Math.random() * 1000) % max;
const createRandomLabel = () => `${WORDS[random(WORDS.length)]} ${COLORS[random(COLORS.length)]} ${NOUNS[random(NOUNS.length)]}`;

const runApp = () => {

  const app = Cue({
    state: 'Table-Data',
    ui: 'Table-UI'
  });

  app.mount(document.getElementById('main'));

};

document.addEventListener('DOMContentLoaded', runApp);