import { ON_REQUEST_START, ON_REQUEST_STOP } from "./internal/make-call.js";

export function onRequestStart(handler, urlIncludes = '*', once = false) {
  register(handler, urlIncludes, ON_REQUEST_START, once);
}

export function onRequestStop(handler, urlIncludes = '*', once = false) {
  register(handler, urlIncludes, ON_REQUEST_STOP, once);
}

function register(cb, includes, stack, once) {
  const event = {
    handler: once ? () => {
      cb();
      stack.delete(event);
    } : cb,
    includes: includes
  };
  stack.add(event);
}