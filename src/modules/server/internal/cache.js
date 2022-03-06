import { PersistentStorage } from "../../state/PersistentStorage.js";

let CACHE = null;

export function setCache(hash, value, expires) {
  return (CACHE || (CACHE = new PersistentStorage({
    name: 'sekoia::network::cache'
  }))).set(hash, {
    value: value,
    expires: Date.now() + expires * 1000
  });
}

export function getCache(hash) {
  return CACHE.get(hash).then(entry => {
    if (entry) {
      if (entry.expires < Date.now()) {
        CACHE.delete(hash);
        throw false;
      } else {
        return entry.value;
      }
    } else {
      throw false;
    }
  });
}