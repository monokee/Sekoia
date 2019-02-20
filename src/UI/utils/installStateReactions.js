function installStateReactions(component, reactions) {

  const stateInternals = component.state[__CUE__];

  let prop, boundHandler;

  for (prop in reactions) {
    boundHandler = stateInternals.addChangeReaction.call(stateInternals, prop, reactions[prop], component, component.autorun);
  }

}