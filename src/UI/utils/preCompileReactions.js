
function preCompileReactions(reactions) {

  // This function exists to allow for an inversion of the public api design from the internal observable implementation:
  // Observables fire change reactions when a property of a state object has changed. We want to subscribe to these changes
  // with specific ui component nodes ($ / refs). Publicly the programmer will declare reactions for $component_nodes
  // explicitly for every state property. Here we simply re-group these reactions into a single function per state property which
  // internally calls the individual handlers for every $component_node that should react.
  // This function has to be called or pre-bound to the scope of each instance of a component.

  const compiled = new Map();

  let ref, stateProp;

  for (ref in reactions) {

    if (ref[0] !== CUE_REF_ID) throw new ReferenceError(`Reactions must be grouped by refs. Refs are sub-elements of a component that are denoted with "${CUE_REF_ID}name_of_the_ref" in the markup.`);
    if (!isObjectLike(reactions[ref])) throw new TypeError(`Reactions of refs must be grouped into objects which map the name of the reactive state property to a reaction handler which modifies the ref element.`);

    for (stateProp in reactions[ref]) {

      const reactionInstaller = {reaction: reactions[ref][stateProp], ref: ref};

      if (compiled.has(stateProp)) {
        compiled.get(stateProp).push(reactionInstaller);
      } else {
        compiled.set(stateProp, [reactionInstaller]);
      }

    }

  }

  // we use a pseudo 2d-array here for faster iteration at instantiation time...
  const reactionHandlers = [];

  compiled.forEach((reactionInstallers, stateProp) => {

    reactionHandlers.push(stateProp, function(value) {
      for (let i = 0, r; i < reactionInstallers.length; i++) {
        (r = reactionInstallers[i]).reaction.call(this, this[r.ref], value);
      }
    });

  });

  return reactionHandlers;

}