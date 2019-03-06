
const CUE_TREEWALKER = DOC.createTreeWalker(DOC, NodeFilter.SHOW_ALL, null, false);

// generates static paths to nodes with a "ref" attribute in a template element. this dramatically speeds up retrieval of ref-nodes
// during instantiation of new ui components... ref-nodes are automatically made available as top-level sub-components
function generateRefPaths(el) {

  CUE_TREEWALKER.currentNode = el;

  const indices = [];

  let ref, i = 0;

  do { // run this at least once...
    if (el.nodeType !== 3 && (ref = el.getAttribute('ref'))) {
      indices.push(ref, i+1);
      i = 1;
    } else {
      i++;
    }
  } while((el = CUE_TREEWALKER.nextNode()));

  return indices;

}

function getRefByIndex(i) {
  while (--i) CUE_TREEWALKER.nextNode();
  return CUE_TREEWALKER.currentNode;
}