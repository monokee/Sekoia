
// generates static paths to nodes with a "$" attribute in a template element. this dramatically speeds up retrieval of ref-nodes
// during instantiation of new ui components... ref-nodes are automatically made available as top-level sub-components as this.$xyz
function generateRefPaths(el) {

  CUE_TREEWALKER.currentNode = el;

  const refPaths = [];

  let ref, i = 0;

  do { // run this at least once...
    if (el.nodeType !== 3 && (ref = extractRefFromTemplate(el))) { // skip text nodes
      refPaths.push(ref, i+1);
      i = 1;
    } else {
      i++;
    }
  } while((el = CUE_TREEWALKER.nextNode()));

  return refPaths;

}

function extractRefFromTemplate(el) {
  if (el.attributes !== void 0) {
    for (let i = 0, name; i < el.attributes.length; i++) {
      name = el.attributes[i].name;
      if (name[0] === CUE_REF_ID) {
        el.removeAttribute(name);
        return name; // we keep the "$" refID
      }
    }
  }
  return EMPTY_STRING;
}

function getRefByIndex(i) {
  while (--i) CUE_TREEWALKER.nextNode();
  return CUE_TREEWALKER.currentNode;
}