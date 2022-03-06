export function defer(callback, timeout = 100) {
  let pending = 0;
  return arg => {
    clearTimeout(pending);
    pending = setTimeout(callback, timeout, arg);
  }
}