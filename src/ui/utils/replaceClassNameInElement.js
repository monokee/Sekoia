
function replaceClassNameInElement(a, b, element) {
  element.classList.replace(a, b);
  for (let i = 0; i < element.children.length; i++) {
    replaceClassNameInElement(a, b, element.children[i]);
  }
}