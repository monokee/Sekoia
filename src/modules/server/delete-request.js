import { makeCall } from "./internal/make-call.js";

export function deleteRequest(url, data, token) {
  return makeCall(url, 'DELETE', token, data);
}