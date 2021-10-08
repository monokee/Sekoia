import { Store } from "../../../build/cue.module.js";

export const TodoStore = Store.create('todos', {

  appTitle: 'Cue Todo',
  appLogo: 'assets/CueLogo__main.svg',
  appAuthor: 'monokee',


}, 'localStorage');