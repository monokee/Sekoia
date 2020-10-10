import { RESOLVED_PROMISE, deepEqual, deepClone } from "./utils.js";
import { Reactor } from "./reactor.js";

const INTERNAL_STORE = new Map();
const INTERNAL_EVENTS = new Map();

export const Store = {

  id: Symbol('Cue.Store'),

  get(key) {

    if (!key) {

      const entireStore = {};

      for (const tuple of INTERNAL_STORE.entries()) {
        entireStore[tuple[0]] = deepClone(tuple[1]);
      }

      return entireStore;

    }

    return deepClone(INTERNAL_STORE.get(key));

  },

  set(key, value) {

    if (key && typeof key === 'object') {

      let response = RESOLVED_PROMISE;

      for (const prop in key) {
        if (!deepEqual(INTERNAL_STORE.get(prop), key[prop])) {
          response = internalStoreSet(prop, key[prop]);
        }
      }

      return response;

    }

    return deepEqual(INTERNAL_STORE.get(key), value) ? RESOLVED_PROMISE : internalStoreSet(key, value);

  },

  has(key) {
    return INTERNAL_STORE.has(key);
  },

  remove(key) {

    if (!INTERNAL_STORE.has(key)) {
      console.warn(`Can't remove Store entry "${key}" because it doesn't exist.`);
      return RESOLVED_PROMISE;
    }

    INTERNAL_STORE.delete(key);
    return dispatchEvent(key, void 0);

  },

  clear(silently = false) {

    if (INTERNAL_STORE.size === 0) {
      return RESOLVED_PROMISE;
    }

    if (silently === true) {
      INTERNAL_STORE.clear();
      return RESOLVED_PROMISE;
    }

    const keys = INTERNAL_STORE.keys();

    INTERNAL_STORE.clear();

    const promises = [];
    for (const key of keys) {
      promises.push(dispatchEvent(key, void 0));
    }

    return Promise.all(promises);

  },

  bind(key) {
    return {
      id: this.id,
      key: key
    };
  },

  subscribe(key, handler, options = {}) {

    const event = Object.assign({
      autorun: false
    }, options, {
      handler: options.scope ? handler.bind(options.scope) : handler
    });

    if (INTERNAL_EVENTS.has(key)) {
      INTERNAL_EVENTS.get(key).push(event);
    } else {
      INTERNAL_EVENTS.set(key, [event]);
    }

    if (event.autorun === true) {
      if (!INTERNAL_STORE.has(key)) {
        console.warn(`Can not autorun Store subscription because "${key}" is not set.`);
      } else {
        dispatchEvent(key, INTERNAL_STORE.get(key));
      }
    }

    return {
      unsubscribe: () => {
        const events = INTERNAL_EVENTS.get(key);
        events.splice(events.indexOf(event), 1);
      }
    }

  }

};

export function internalStoreGet(key) {
  return INTERNAL_STORE.get(key);
}

export function internalStoreSet(key, value) {
  INTERNAL_STORE.set(key, value);
  return dispatchEvent(key, value);
}

function dispatchEvent(key, value) {

  const event = INTERNAL_EVENTS.get(key);

  if (event) {

    for (let i = 0; i < event.length; i++) {
      Reactor.cueEvent(event[i].handler, value);
    }

    return Reactor.react();

  } else {

    return RESOLVED_PROMISE;

  }

}