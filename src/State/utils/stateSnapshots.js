
/**
 * Retrieve a deep copy (Snapshot) of the current state.
 * Generic method that is called from instances via internalGetters (see buildStateModule.js)
 * @param [asJSON = false] - Whether or not the snapshot should be retrieved as a JSON string or not. Defaults to false.
 * @returns A deep clone of the state instance.
 */
function retrieveState(asJSON = false) {
  const internals = this[__CUE__];
  const clone = isArray(internals.plainState) ? deepCloneArray(internals.plainState) : deepClonePlainObject(internals.plainState);
  return asJSON ? JSON.stringify(clone) : clone;
}

/**
 * Apply a state snapshot (props) to a state instance.
 * Internally reconciles the passed props with the existing state and mutates the shape of the existing state to match the shape of the props.
 * Allows for top-down batch operations that mimic an immutable interface while the atomic internal change detection and mutation notifications continue to work as expected.
 * @param props - JSON string, object literal or array that will be patched into the current state, causing all mutated properties to queue their dependencies throughout the tree.
 */
function applyState(props) {

  // For batch-applying data collections from immutable sources.
  // Internally reconciles the passed props with the existing state tree and only mutates the deltas.
  // Immediate reactions of the mutated properties are collected on an accumulation stack.
  // Only after the batch operation has finished, the accumulated reactions queue their dependencies and we react in a single flush.
  //TODO: defer all recursive lookups involving provided properties (upstream/downstream) until after applyState is done reconciling.
  // OR BETTER YET: completely work around any proxy interception for batch updates. create a specific set method that is called DIRECTLY from patchState
  // that collects only unique immediate dependencies on an accumulation stack. after patchState has run, we explicitly cue up the dependencies of the accumulated dependencies (including setters to provided states)
  // and only then react to the collective change in a single batch. This will be insanely performant because every change will only be evaluated and reacted to once. This is huge!
  // THIS has the other advantage that I can also reduce the cue and react logic because we no longer have to check for accumulations as this is explicitly outsourced to a special callback.

  const internals = this[__CUE__];

  if (props.constructor === String) {
    props = JSON.parse(props);
  }

  isAccumulating = true;
  patchState(internals.rootInternals.proxyState, internals.rootPropertyName, props);
  isAccumulating = false;

  cueAccumulated();
  react();

}