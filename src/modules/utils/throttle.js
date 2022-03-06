export function throttle (callback, interval) {
  let pending = 0;
  const reset = () => (pending = 0);
  return arg => {
    if (!pending) {
      callback(arg);
      pending = setTimeout(reset, interval);
    }
  }
}