import { deepClone, deepEqual } from "./utils.js";
import { Reactor } from "./reactor";

const getStorageKey = (name, key) =>  name + '.' + key + '::CueStore';
const jsonReplacer = (key, value) => value === undefined ? null : value;

const ALL_STORES = new Map();
const INTERNAL = Symbol('Cue.Store.internals');

export const STORE_BINDING_ID = Symbol('Cue.Store');
export const INTERNAL_STORE_SET = Symbol('Cue.Store.set');
export const INTERNAL_STORE_GET = Symbol('Cue.Store.get');
export const INTERNAL_STORE_DISPATCH = Symbol('Cue.Store.dispatch');

class CueStoreBinding {

  constructor(store, key) {
    this.id = STORE_BINDING_ID;
    this.store = store;
    this.key = key;
  }

  get(deep = false) {
    return deep === true ? deepClone(this.store[INTERNAL].data[this.key]) : this.store[INTERNAL].data[this.key];
  }

  set(value) {
    this.store[INTERNAL].data[this.key] = value;
    this.store[INTERNAL_STORE_DISPATCH](this.key, value);
  }

}

class CueStore {

  constructor(name, data, storage) {

    const internal = this[INTERNAL] = {
      name: name,
      defaultData: deepClone(data),
      events: new Map(),
      bindings: new Map(),
      storage: storage,
    };

    if (storage === null) {

      // flag
      internal.usesStorage = false;

      // in-memory store
      internal.data = deepClone(data);

    } else {

      // flag
      internal.usesStorage = true;

      // cache storage keys
      const storageKeys = internal.storageKeys = {};

      // populate storage if its not yet populated
      for (const key in data) {

        const storageKey = getStorageKey(name, key);

        storageKeys[key] = storageKey;

        if (storage.getItem(storageKey) === null) {
          storage.setItem(storageKey, JSON.stringify(internal.defaultData[key], jsonReplacer));
        }

      }

      // create a disc-storage proxy wrapper so we can use internal.data like a regular object while writing to and reading from disc storage
      internal.data = new Proxy({}, {
        get(target, key) {
          return JSON.parse(storage.getItem(storageKeys[key] || getStorageKey(name, key)))
        },
        set(target, key, value) {
          storage.setItem(storageKeys[key] || getStorageKey(name, key), JSON.stringify(value, jsonReplacer));
          return true;
        },
        has(target, key) {
          return storage.getItem(storageKeys[key] || getStorageKey(name, key)) !== null;
        },
        deleteProperty(target, key) {
          storage.removeItem(storageKeys[key] || getStorageKey(name, key));
          return true;
        }
      });

    }

  }

  [INTERNAL_STORE_GET](key) {
    return this[INTERNAL].data[key];
  }

  [INTERNAL_STORE_SET](key, value) {
    this[INTERNAL].data[key] = value;
    this[INTERNAL_STORE_DISPATCH](key, value);
  }

  [INTERNAL_STORE_DISPATCH](key, value) {

    const event = this[INTERNAL].events.get(key);

    if (event) {

      for (let i = 0; i < event.length; i++) {
        Reactor.cueEvent(event[i], value);
      }

      Reactor.react();

    }

  }

  get(key) {

    const internal = this[INTERNAL];

    // storage already does deep clone via stringify
    if (internal.usesStorage) {

      if (!key) {

        const entireStore = {};

        for (const key in internal.defaultData) {
          entireStore[key] = internal.data[key];
        }

        return entireStore;

      }

      return internal.data[key];

    }

    // clone memory objects
    if (!key) {
      return deepClone(internal.data);
    }

    return deepClone(internal.data[key]);

  }

  set(key, value) {

    const data = this[INTERNAL].data;

    if (key && typeof key === 'object') {

      let prop, val;

      for (prop in key) {
        val = key[prop];
        if (!deepEqual(data[prop], val)) {
          this[INTERNAL_STORE_SET](prop, val);
        }
      }

    } else if (!deepEqual(data[key], value)) {

      this[INTERNAL_STORE_SET](key, value);

    }

  }

  reset(key) {
    if (!key) {
      this.set(deepClone(this[INTERNAL].defaultData));
    } else {
      this.set(key, deepClone(this[INTERNAL].defaultData[key]));
    }
  }

  has(key) {

    const internal = this[INTERNAL];

    if (internal.usesStorage) {
      return internal.storage.getItem(internal.storageKeys[key] || getStorageKey(internal.name, key)) !== null;
    } else {
      return this[INTERNAL].data.hasOwnProperty(key);
    }

  }

  remove(key) {
    delete this[INTERNAL].data[key];
    this[INTERNAL_STORE_DISPATCH](key, void 0);
  }

  bind(key) {

    const internal = this[INTERNAL];

    if (!internal.bindings.has(key)) {
      internal.bindings.set(key, new CueStoreBinding(this, key));
    }

    return internal.bindings.get(key);

  }

  subscribe(key, handler, autorun = false) {

    const internal = this[INTERNAL];

    if (internal.events.has(key)) {
      internal.events.get(key).push(handler);
    } else {
      internal.events.set(key, [handler]);
    }

    if (autorun === true) {
      this[INTERNAL_STORE_DISPATCH](key, internal.data[key]);
    }

    return {
      unsubscribe: () => {
        const events = internal.events.get(key);
        events.splice(events.indexOf(handler), 1);
      }
    }

  }

}

export const Store = {

  create(name, data, storage = null) {

    if (ALL_STORES.has(name)) {
      throw new Error('Can not create Store "' + name + '". A store with the same name already exists.');
    }

    const store = new CueStore(name, data, storage);

    ALL_STORES.set(name, store);

    return store;

  },

  destroy(name) {

    if (!ALL_STORES.has(name)) {
      throw new Error('Can not destroy Store "' + name + '". Store does not exist.');
    }

    const store = ALL_STORES.get(name);
    store.clear(true);
    store[INTERNAL].events.clear();
    ALL_STORES.delete(name);

  }

};