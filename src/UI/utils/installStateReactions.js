function installStateReactions(component, reactions) {

  const stateInstance = component.state[__CUE__];

  let prop, boundHandler;

  for (prop in reactions) {

    boundHandler = stateInstance.addChangeReaction(component.state, prop, reactions[prop], component, component.autorun);

    if (component.reactions.has(prop)) {
      component.reactions.get(prop).push(boundHandler);
    } else {
      component.reactions.set(prop, [boundHandler]);
    }

  }

}