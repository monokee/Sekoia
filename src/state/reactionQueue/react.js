
function react() {

  isReacting = true;

  const l = MAIN_QUEUE.length;

  // MAIN_QUEUE contains tuples of [observer, changedValue, changedProperty]
  for (let i = 0; i < l; i += 3) {
    MAIN_QUEUE[i].react(MAIN_QUEUE[i + 1], MAIN_QUEUE[i + 2]);
  }

  // empty the queue
  MAIN_QUEUE.splice(0, l);

  isReacting = false;

}