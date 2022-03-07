import { hashString } from "../utils/hash-string.js";
import { getCache, setCache } from "./internal/cache.js";
import { makeCall } from "./internal/make-call.js";

export function getRequest(url, cacheSeconds = 0, token = '') {
  const hash = hashString(url);
  return getCache(hash)
    .then(data => data)
    .catch(() => makeCall(url, 'GET', token).then(res => {
      cacheSeconds > 0 && setCache(hash, res, cacheSeconds);
      return res;
    }));
}