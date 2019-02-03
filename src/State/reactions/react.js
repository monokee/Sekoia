
/**
 * Runs through the Main Queue to execute each collected reaction with each collected observation payload as the first and only argument.
 * Main Queue is emptied after each call to react.
 * @function react
 */
function react() {

  if (MAIN_QUEUE.length && !isAccumulating) {
    isReacting = true;
    for (let i = 0; i < MAIN_QUEUE.length; i += 2) MAIN_QUEUE[i](MAIN_QUEUE[i + 1]);
    MAIN_QUEUE.splice(0, MAIN_QUEUE.length);
    isReacting = false;
  }

}