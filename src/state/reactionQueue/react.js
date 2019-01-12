
function react() {

  isReacting = true;

  const l = MAIN_QUEUE.length;

  // MAIN_QUEUE contains pairs of i: reactionHandler(), i+1: payload{property, value, oldValue}
  for (let i = 0; i < l; i += 2) {
    MAIN_QUEUE[i](MAIN_QUEUE[i + 1]);
  }

  // empty the queue
  MAIN_QUEUE.splice(0, l);

  isReacting = false;

}