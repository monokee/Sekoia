import { deepClone, hashString, deepEqual } from "./utils.js";
import { Reactor } from "./reactor";

const getStorageKey = (name, key) => hashString('cs-' + name + key);

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
      data: deepClone(data),
      events: new Map(),
      bindings: new Map(),
      storage: storage,
    };

    if (storage !== null) {

      for (const key in internal.data) {

        const storageKey = getStorageKey(name, key);

        // attempt to populate data from storage
        internal.data[key] = JSON.parse(storage.getItem(storageKey)) || internal.data[key];

        // bind event listeners to update storage when store changes
        internal.events.set(key, [newValue => {
          if (newValue === void 0) newValue = null; // convert undefined to null
          storage.setItem(storageKey, JSON.stringify(newValue));
        }]);

      }

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

    if (!key) {
      return deepClone(this[INTERNAL].data);
    }

    return deepClone(this[INTERNAL].data[key]);

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

    }

    if (!deepEqual(data[key], value)) {
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
    return this[INTERNAL].data.hasOwnProperty(key);
  }

  remove(key) {

    const internal = this[INTERNAL];

    if (internal.storage !== null) {
      internal.storage.removeItem(getStorageKey(internal.name, key));
    }

    if (internal.data.hasOwnProperty(key)) {
      delete internal.data[key];
      this[INTERNAL_STORE_DISPATCH](key, void 0);
    }

  }

  clear(silently = false) {

    const internal = this[INTERNAL];

    if (internal.storage !== null) {
      for (const key in internal.data) {
        internal.storage.removeItem(getStorageKey(internal.name, key));
      }
    }

    if (silently === true) {
      internal.data = {};
    }

    for (const key in internal.data) {
      this[INTERNAL_STORE_DISPATCH](key, void 0);
    }

    internal.data = {};

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

  getStorageKey(key) {
    return getStorageKey(this[INTERNAL].name, key);
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