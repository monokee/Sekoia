function installStateReactions(component, reactions) {

  const stateInternals = component.state[__CUE__];

  let prop, boundHandler;

  for (prop in reactions) {

    boundHandler = stateInternals.addChangeReaction.call(stateInternals, prop, reactions[prop], component, component.autorun);

    // TODO: not sure what we need this for
    if (component.reactions.has(prop)) {
      component.reactions.get(prop).push(boundHandler);
    } else {
      component.reactions.set(prop, [boundHandler]);
    }

  }

}