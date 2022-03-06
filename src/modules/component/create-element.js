const TEMPLATE = document.createElement('template');

export function createElement(node) {
  typeof node === 'function' && (node = node());
  TEMPLATE.innerHTML = node;
  return TEMPLATE.content.firstElementChild;
}