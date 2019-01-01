
// Observation Object
class Observation {

  constructor(type, property, value, mutationDetails) {
    this.type = type;
    this.property = property;
    this.value = value;
    this.mutationDetails = mutationDetails;
  }

}

// Observer Entity
class Observer {

  constructor(reactor, reaction) {
    this.reactor = reactor;
    this.reactionTarget = reactor.target;
    this.reaction = reaction;
  }

  react(observation) {
    this.reaction.call(this.reactionTarget, observation); // TODO: entire class is obsolete. reaction should be called with CueComponent as "this" not the domElement.
  }

}