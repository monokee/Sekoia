
function createComponentFactory(name, initializer) {

  let UIModule = null;

  return state => {

    if (UIModule === null) {
      UIModule = buildUIModule(name, initializer);
    }

    return new UIModule(state).element;

  }

}