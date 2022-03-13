export function onDragOver(element, onDrop) {

  element.addEventListener('dragenter', e => {
    element.classList.add('dragover');
  });

  element.addEventListener('dragleave', e => {
    element.classList.remove('dragover');
  });

  element.addEventListener('dragover', e => {
    e.preventDefault();
  });

  element.addEventListener('drop', e => {
    e.preventDefault();
    element.classList.remove('dragover');
    onDrop(e.dataTransfer.files);
  });

}