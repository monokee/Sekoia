
/**
 * Runs through the Main Queue to execute each collected reaction with each collected observation payload as the first and only argument.
 * Main Queue is emptied after each call to react.
 * @function react
 */
function react() {

  /**
   * @external {boolean}  isReacting - flag indicating to interceptors that we are now reacting to changes. Used to prevent state mutations inside of reaction handlers.
   * @external {Array}    MAIN_QUEUE - Contains pairs of i = reactionHandler() and i+1 = observation payload {value, oldValue}
   */
  isReacting = true;

  const l = MAIN_QUEUE.length;

  for (let i = 0; i < l; i += 2) {
    MAIN_QUEUE[i](MAIN_QUEUE[i + 1]);
  }

  // empty the queue
  MAIN_QUEUE.splice(0, l);

  isReacting = false;

}