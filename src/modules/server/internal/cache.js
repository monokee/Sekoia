import { PersistentStorage } from "../../state/PersistentStorage.js";

const CACHE = () => CACHE.$$ || (CACHE.$$ = new PersistentStorage({
  name: 'sekoia::network::cache'
}));

export function setCache(hash, value, cacheSeconds) {
  return CACHE().set(hash, {
    value: value,
    expires: Date.now() + (cacheSeconds * 1000)
  });
}

export function getCache(hash) {
  return CACHE().get(hash).then(entry => {
    if (entry) {
      if (entry.expires < Date.now()) {
        CACHE().delete(hash);
        throw false;
      } else {
        return entry.value;
      }
    } else {
      throw false;
    }
  });
}