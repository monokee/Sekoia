import { makeCall } from "./internal/make-call.js";

export function postRequest(url, data, token) {
  return makeCall(url, 'POST', token, data);
}