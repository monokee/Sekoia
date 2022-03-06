import { makeCall } from "./internal/make-call.js";

export function putRequest(url, data, token) {
  return makeCall(url, 'PUT', token, data);
}