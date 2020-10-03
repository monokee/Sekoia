import { RESOLVED_PROMISE, deepEqual, deepClone } from "./utils.js";
import { Reactor } from "./reactor.js";

const STORE = new Map();
const EVENTS = new Map();

export const Store = {

  id: Symbol('Cue.Store'),

  get(key) {

    if (!key) {

      const entireStore = {};

      for (const tuple of STORE.entries()) {
        entireStore[tuple[0]] = deepClone(tuple[1]);
      }

      return entireStore;

    }

    return deepClone(STORE.get(key));

  },

  set(key, value) {

    if (key && typeof key === 'object') {

      let anyPropChanged = false;

      for (const prop in key) {
        const thisPropChanged = internalStoreSet(prop, key[prop], true);
        anyPropChanged = anyPropChanged || thisPropChanged;
      }

      return anyPropChanged ? Reactor.react() : RESOLVED_PROMISE;

    }

    return internalStoreSet(key, value, true) ? Reactor.react() : RESOLVED_PROMISE;

  },

  has(key) {
    return STORE.has(key);
  },

  remove(key) {

    if (!STORE.has(key)) {
      console.warn(`Can't remove Store entry "${key}" because it doesn't exist.`);
      return RESOLVED_PROMISE;
    }

    STORE.delete(key);
    return dispatchEvent(key, void 0);

  },

  clear(silently = false) {

    if (STORE.size === 0) {
      return RESOLVED_PROMISE;
    }

    if (silently === true) {
      STORE.clear();
      return RESOLVED_PROMISE;
    }

    const keys = STORE.keys();

    STORE.clear();

    const promises = [];
    for (const key of keys) {
      promises.push(dispatchEvent(key, void 0));
    }

    return Promise.all(promises);

  },

  bind(key, defaultValue) {
    const storeBinding = {id: this.id, path: key};
    return arguments.length === 1
      ? storeBinding
      : Object.assign(storeBinding, {defaultValue});
  },

  subscribe(key, handler, options = {}) {

    const event = Object.assign({
      autorun: false
    }, options, {
      handler: options.scope ? handler.bind(options.scope) : handler
    });

    if (EVENTS.has(key)) {
      EVENTS.get(key).push(event);
    } else {
      EVENTS.set(key, [event]);
    }

    if (event.autorun === true) {
      if (!STORE.has(key)) {
        console.warn(`Can not autorun Store subscription because "${key}" is not set.`);
      } else {
        dispatchEvent(key, STORE.get(key));
      }
    }

    return {
      unsubscribe: () => {
        const events = EVENTS.get(key);
        events.splice(events.indexOf(event), 1);
      }
    }

  }

};

export function internalStoreSet(key, value, deepCompare) {

  if (deepCompare === true && deepEqual(STORE.get(key), value)) {
    return false;
  }

  STORE.set(key, value);
  dispatchEvent(key, value);

  return true;

}

function dispatchEvent(key, value) {

  const event = EVENTS.get(key);

  if (event) {

    for (let i = 0; i < event.length; i++) {
      Reactor.cueEvent(event[i].handler, value);
    }

    return Reactor.react();

  } else {

    return RESOLVED_PROMISE;

  }

}