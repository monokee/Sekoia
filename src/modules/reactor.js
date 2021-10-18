const EVENTS = new Map();
const CALLBACKS = new Map();
const COMPUTED_PROPERTIES = new Map();
const DEPENDENCIES = new Map();
const RESOLVED = [];

let SCHEDULED_REACTION = null;

export const Reactor = {

  cueEvent(eventHandler, value) {
    EVENTS.set(eventHandler, value);
  },

  cueCallback(handler, value) {
    CALLBACKS.set(handler, value);
  },

  cueComputations(key, componentInternals) {
    const computedProperties = componentInternals.dependencyGraph.get(key);
    for (let i = 0; i < computedProperties.length; i++) {
      COMPUTED_PROPERTIES.set(computedProperties[i], componentInternals);
    }
  },

  react() {
    cancelAnimationFrame(SCHEDULED_REACTION);
    SCHEDULED_REACTION = requestAnimationFrame(flushReactionBuffer);
  }

};

// ----------------------------------------

function flushReactionBuffer() {

  let i, tuple, deps, computedProperty, internals, callbacks, dependencyGraph, result;

  // STORE EVENTS ------------>
  for (tuple of EVENTS.entries()) {
    tuple[0](tuple[1]);
  }

  // RESOLVE COMPUTED_PROPERTIES ------------>
  while (COMPUTED_PROPERTIES.size > 0) {

    for (tuple of COMPUTED_PROPERTIES.entries()) {

      computedProperty = tuple[0]; // key

      if (RESOLVED.indexOf(computedProperty) === -1) {

        internals = tuple[1];

        dependencyGraph = internals.dependencyGraph;
        callbacks = internals.reactions;

        computedProperty.needsUpdate = true;
        result = computedProperty.value(internals.data);

        if (computedProperty.hasChanged === true) {

          // Dispatch Data Event on Component Instance
          internals.dataEvent.detail.key = computedProperty.ownPropertyName;
          internals.dataEvent.detail.value = result;
          internals.self.dispatchEvent(internals.dataEvent);

          if (callbacks[computedProperty.ownPropertyName]) {
            CALLBACKS.set(callbacks[computedProperty.ownPropertyName], result);
          }

          DEPENDENCIES.set(computedProperty, internals);

        }

        RESOLVED.push(computedProperty);

      }

    }

    COMPUTED_PROPERTIES.clear();

    for (tuple of DEPENDENCIES.entries()) {

      computedProperty = tuple[0];
      internals = tuple[1];
      deps = internals.dependencyGraph.get(computedProperty.ownPropertyName); // context[0] === dependencyGraph

      if (deps) {
        for (i = 0; i < deps.length; i++) {
          COMPUTED_PROPERTIES.set(deps[i], internals);
        }
      }

    }

    DEPENDENCIES.clear();

  }

  // REACTION CALLBACKS ----------->
  for (tuple of CALLBACKS.entries()) {
    tuple[0](tuple[1]);
  }

  // RESET BUFFERS -------->
  EVENTS.clear();
  CALLBACKS.clear();

  while(RESOLVED.length > 0) {
    RESOLVED.pop();
  }

}