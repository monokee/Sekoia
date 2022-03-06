// In-Memory Fallback that mocks required IndexedDB patterns
class AsyncMemoryRequest {

  constructor(result) {
    requestAnimationFrame(() => {
      this.onsuccess({target: { result: result }})
    });
  }

  onsuccess() {}

}

class MemoryObjectStore {

  constructor() {
    this.__data = new Map();
  }

  get(key) {
    return new AsyncMemoryRequest(this.__data.get(key));
  }

  getAll() {
    return new AsyncMemoryRequest(this.__data);
  }

  put(value, key) {
    return new AsyncMemoryRequest(this.__data.set(key, value));
  }

  delete(key) {
    return new AsyncMemoryRequest(this.__data.delete(key));
  }

  clear() {
    return new AsyncMemoryRequest(this.__data.clear())
  }

}

class IndexedMemoryStorage {

  constructor() {

    const memo = new MemoryObjectStore();

    this.__transaction = {
      objectStore: () => memo
    };

  }

  transaction() {
    return this.__transaction;
  }

}

const OBJECT_STORE = 'store';
const TRANSACTION = [OBJECT_STORE];

// IndexedDB Abstraction that can be used like async Web Storage
export class PersistentStorage {

  constructor(options = {}) {

    options = Object.assign({}, {
      name: location.origin,
      onUnavailable: null
    }, options);

    this.__name = options.name;

    this.__ready = new Promise(resolve => {

      try {

        let request = window.indexedDB.open(this.__name);
        let database;

        request.onupgradeneeded = e => {
          database = e.target.result;
          database.createObjectStore(OBJECT_STORE);
        };

        request.onsuccess = e => {
          database = e.target.result;
          resolve(database);
        };

        request.onerror = e => {
          database = new IndexedMemoryStorage();
          resolve(database);
        }

      } catch(e) {

        console.warn('[PersistentStorage]: indexedDB not available. Falling back to memory.', e);
        typeof options.onUnavailable === 'function' && options.onUnavailable(e);
        resolve(new IndexedMemoryStorage());

      }

    });

  }

  has(key) {
    return this.__ready.then(db => new Promise((resolve, reject) => {
      const request = db.transaction(TRANSACTION, 'readonly').objectStore(OBJECT_STORE).count(key);
      request.onsuccess = e => resolve(!!e.target.result);
      request.onerror = reject;
    }));
  }

  get(key) {
    return this.__ready.then(db => new Promise((resolve, reject) => {
      const store = db.transaction(TRANSACTION, 'readonly').objectStore(OBJECT_STORE);
      const request = key === void 0 ? store.getAll() : store.get(key);
      request.onsuccess = e => resolve(e.target.result);
      request.onerror = reject;
    }));
  }

  set(key, value) {
    return this.__ready.then(db => new Promise((resolve, reject) => {
      const request = db.transaction(TRANSACTION, 'readwrite');
      const store = request.objectStore(OBJECT_STORE);
      if (typeof key === 'object') {
        for (const k in key) {
          if (key.hasOwnProperty(k)) {
            store.put(key[k], k);
          }
        }
      } else {
        store.put(value, key);
      }
      request.onsuccess = resolve;
      request.onerror = reject;
    }));
  }

  delete(key) {

    if (key === void 0) {
      return this.clear();
    }

    return this.__ready.then(db => new Promise((resolve, reject) => {
      const request = db.transaction(TRANSACTION, 'readwrite');
      const store = request.objectStore(OBJECT_STORE);
      if (Array.isArray(key)) {
        key.forEach(k => store.delete(k));
      } else {
        store.delete(key);
      }
      request.onsuccess = resolve;
      request.onerror = reject;
    }));

  }

  clear() {
    return this.__ready.then(db => new Promise((resolve, reject) => {
      const request = db.transaction(TRANSACTION, 'readwrite').objectStore(OBJECT_STORE).clear();
      request.onsuccess = resolve;
      request.onerror = reject;
    }));
  }

  destroy() {
    return this.__ready.then(db => new Promise((resolve, reject) => {
      db.close();
      const request = window.indexedDB.deleteDatabase(this.__name);
      request.onsuccess = resolve;
      request.onerror = reject;
    }));
  }

}