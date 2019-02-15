
/**
 * Runs through the Main Queue to execute each collected reaction with each collected observation payload as the first and only argument.
 * Main Queue is emptied after each call to react.
 * @function react
 */
function react() {

  if (MAIN_QUEUE.length) {

    // Queue contains tuples of (handler, value, path) -> call i[0](i[1],[i2]) ie handler(value, path)
    for (let i = 0; i < MAIN_QUEUE.length; i += 3) {
      MAIN_QUEUE[i](MAIN_QUEUE[i + 1], MAIN_QUEUE[i + 2]);
    }

    // Empty the queue.
    MAIN_QUEUE.splice(0, MAIN_QUEUE.length);

  }

}