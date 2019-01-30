function installStateReactions(component, reactions) {

  const stateInstance = component.state[__CUE__];

  let prop, val, boundHandler;

  if (component.autorun === true) {

    for (prop in reactions) {

      val = component.state[prop];

      boundHandler = stateInstance.addChangeReaction(prop, reactions[prop], component);

      if (component.reactions.has(prop)) {
        component.reactions.get(prop).push(boundHandler);
      } else {
        component.reactions.set(prop, [boundHandler]);
      }

      boundHandler({property: prop, value: val, oldValue: val});

    }

  } else {

    for (prop in reactions) {

      boundHandler = stateInstance.addChangeReaction(prop, reactions[prop], component);

      if (component.reactions.has(prop)) {
        component.reactions.get(prop).push(boundHandler);
      } else {
        component.reactions.set(prop, [boundHandler]);
      }

    }

  }

}