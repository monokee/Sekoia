let RESIZE_OBSERVER, HANDLERS, RESIZE_BUFFER;

export function onResize(element, handler) {

  if (element === window || element === document || element === document.documentElement) {
    element = document.body;
  }

  if ((HANDLERS || (HANDLERS = new Map())).has(element)) {
    HANDLERS.get(element).push(handler);
  } else {
    HANDLERS.set(element, [handler]);
  }

  (RESIZE_OBSERVER || (RESIZE_OBSERVER = new ResizeObserver(entries => {
    clearTimeout(RESIZE_BUFFER);
    RESIZE_BUFFER = setTimeout(ON_RESIZE, 100, entries);
  }))).observe(element);

}

function ON_RESIZE(entries) {
  for (let i = 0, entry, handlers; i < entries.length; i++) {
    entry = entries[i];
    handlers = HANDLERS.get(entry.target);
    if (handlers) {
      for (let k = 0; k < handlers.length; k++) {
        handlers[k](entry);
      }
    }
  }
}