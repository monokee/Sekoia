
function reconcile(parentElement, currentArray, newArray, createFn, updateFn) {

  // optimized array reconciliation algorithm based on the following implementations
  // https://github.com/localvoid/ivi
  // https://github.com/adamhaile/surplus
  // https://github.com/Freak613/stage0

  let prevStart = 0, newStart = 0;
  let loop = true;
  let prevEnd = currentArray.length-1, newEnd = newArray.length-1;
  let a, b;
  let prevStartNode = parent.firstChild, newStartNode = prevStartNode;
  let prevEndNode = parent.lastChild, newEndNode = prevEndNode;
  let afterNode;

  // scan over common prefixes, suffixes, and simple reversals
  outer : while(loop) {

    loop = false;

    let _node;

    // Skip prefix
    a = currentArray[prevStart];
    b = newArray[newStart];

    while(a === b) {

      updateFn(prevStartNode, b);

      prevStart++;
      newStart++;

      newStartNode = prevStartNode = prevStartNode.nextSibling;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevStart];
      b = newArray[newStart];

    }

    // Skip suffix
    a = currentArray[prevEnd];
    b = newArray[newEnd];

    while(a === b) {

      updateFn(prevEndNode, b);

      prevEnd--;
      newEnd--;

      afterNode = prevEndNode;
      newEndNode = prevEndNode = prevEndNode.previousSibling;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevEnd];
      b = newArray[newEnd];

    }

    // Swap backward
    a = currentArray[prevEnd];
    b = newArray[newStart];

    while(a === b) {

      loop = true;
      updateFn(prevEndNode, b);

      _node = prevEndNode.previousSibling;
      parent.insertBefore(prevEndNode, newStartNode);
      newEndNode = prevEndNode = _node;

      newStart++;
      prevEnd--;

      if (prevEnd < prevStart || newEnd < newStart){
        break outer;
      }

      a = currentArray[prevEnd];
      b = newArray[newStart];

    }

    // Swap forward
    a = currentArray[prevStart];
    b = newArray[newEnd];

    while(a === b) {

      loop = true;

      updateFn(prevStartNode, b);

      _node = prevStartNode.nextSibling;
      parent.insertBefore(prevStartNode, afterNode);
      afterNode = newEndNode = prevStartNode;
      prevStartNode = _node;

      prevStart++;
      newEnd--;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevStart];
      b = newArray[newEnd];

    }

  }

  // Remove Node(s)
  if (newEnd < newStart) {
    if (prevStart <= prevEnd) {
      let next;
      while(prevStart <= prevEnd) {
        if (prevEnd === 0) {
          parent.removeChild(prevEndNode);
        } else {
          next = prevEndNode.previousSibling;
          parent.removeChild(prevEndNode);
          prevEndNode = next;
        }
        prevEnd--;
      }
    }
    return;
  }

  // Add Node(s)
  if (prevEnd < prevStart) {
    if (newStart <= newEnd) {
      while(newStart <= newEnd) {
        afterNode
          ? parent.insertBefore(createFn(newArray[newStart]), afterNode)
          : parent.appendChild(createFn(newArray[newStart]));
        newStart++
      }
    }
    return;
  }

  // Simple cases don't apply. Prepare full reconciliation:

  // Collect position index of nodes in current DOM
  const positions = new Array(newEnd + 1 - newStart);
  // Map indices of current DOM nodes to indices of new DOM nodes
  const indices = new Map();

  let i;

  for(i = newStart; i <= newEnd; i++) {
    positions[i] = -1;
    indices.set(newArray[i], i);
  }

  let reusable = 0, toRemove = [];

  for(i = prevStart; i <= prevEnd; i++) {

    if (indices.has(currentArray[i])) {
      positions[indices.get(currentArray[i])] = i;
      reusable++;
    } else {
      toRemove.push(i);
    }

  }

  // Full Replace
  if (reusable === 0) {

    parent.textContent = '';

    for(i = newStart; i <= newEnd; i++) {
      parent.appendChild(createFn(newArray[i]));
    }

    return;

  }

  // Full Patch around longest increasing sub-sequence
  const snake = longestIncreasingSubsequence(positions, newStart);

  // gather nodes
  const nodes = [];
  let tmpC = prevStartNode;

  for(i = prevStart; i <= prevEnd; i++) {
    nodes[i] = tmpC;
    tmpC = tmpC.nextSibling
  }

  for(i = 0; i < toRemove.length; i++) {
    parent.removeChild(nodes[toRemove[i]]);
  }

  let snakeIndex = snake.length - 1, tempNode;
  for(i = newEnd; i >= newStart; i--) {

    if(snake[snakeIndex] === i) {

      afterNode = nodes[positions[snake[snakeIndex]]];
      updateFn(afterNode, newArray[i]);
      snakeIndex--;

    } else {

      if (positions[i] === -1) {
        tempNode = createFn(newArray[i]);
      } else {
        tempNode = nodes[positions[i]];
        updateFn(tempNode, newArray[i]);
      }

      parent.insertBefore(tempNode, afterNode);
      afterNode = tempNode;

    }

  }

}