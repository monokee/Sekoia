// ------------ INTERNALS ---------

const subSequence = (ns, newStart) => {

  // inline-optimized implementation of longest-positive-increasing-subsequence algorithm
  // https://en.wikipedia.org/wiki/Longest_increasing_subsequence

  const seq = [];
  const is = [];
  const pre = new Array(ns.length);

  let l = -1, i, n, j;

  for (i = newStart; i < ns.length; i++) {

    n = ns[i];

    if (n < 0) continue;

    let lo = -1, hi = seq.length, mid;

    if (hi > 0 && seq[hi - 1] <= n) {

      j = hi - 1;

    } else {

      while (hi - lo > 1) {

        mid = Math.floor((lo + hi) / 2);

        if (seq[mid] > n) {
          hi = mid;
        } else {
          lo = mid;
        }

      }

      j = lo;

    }

    if (j !== -1) {
      pre[i] = is[j];
    }

    if (j === l) {
      l++;
      seq[l] = n;
      is[l] = i;
    } else if (n < seq[j + 1]) {
      seq[j + 1] = n;
      is[j + 1] = i;
    }

  }

  for (i = is[l]; l >= 0; i = pre[i], l--) {
    seq[l] = i;
  }

  return seq;

};

// ------------ EXPORTS ---------

const NOOP = (() => {});

const deepEqual = (a, b) => {

  if (a === b) {
    return true;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {

    if (a.constructor !== b.constructor) return false;

    let i;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (i = a.length; i-- !== 0;) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keys = Object.keys(a);
    const length = keys.length;

    if (length !== Object.keys(b).length) return false;

    for (i = length; i-- !== 0;) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    }

    for (i = length; i-- !== 0;) {
      const key = keys[i];
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;

  }

  return a !== a && b !== b;

};

const deepClone = x => {

  if (!x || typeof x !== 'object') {
    return x;
  }

  if (Array.isArray(x)) {
    const y = [];
    for (let i = 0; i < x.length; i++) {
      y.push(deepClone(x[i]));
    }
    return y;
  }

  const keys = Object.keys(x);
  const y = {};
  for (let i = 0, k; i < keys.length; i++) {
    k = keys[i];
    y[k] = deepClone(x[k]);
  }

  return y;

};

const areArraysShallowEqual = (a, b) => {

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;

};

const arePlainObjectsShallowEqual = (a, b) => {

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0, k; i < keysA.length; i++) {
    k = keysA[i];
    if (keysB.indexOf(k) === -1 || a[k] !== b[k]) {
      return false;
    }
  }

  return true;

};

const hashString = (str) => {
  if (!str.length) return '0';
  let hash = 0;
  for (let i = 0, char; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash + '';
};

const getArrayIntersection = (a, b) => {

  const intersection = [];

  for (let x = 0; x < a.length; x++) {
    for (let y = 0; y < b.length; y++) {
      if (a[x] === b[y]) {
        intersection.push(a[x]);
        break;
      }
    }
  }

  return intersection;

};

const getArrayTail = (a, b) => {

  const tail = [];

  for (let i = a.length; i < b.length; i++) {
    tail.push(b[i]);
  }

  return tail;

};

const buildParamsFromQueryString = queryString => {

  const params = {};

  if (queryString.length > 1) {
    const queries = queryString.substring(1).replace(/\+/g, ' ').replace(/;/g, '&').split('&');
    for (let i = 0, kv, key; i < queries.length; i++) {
      kv = queries[i].split('=', 2);
      key = decodeURIComponent(kv[0]);
      if (key) {
        params[key] = kv.length > 1 ? decodeURIComponent(kv[1]) : true;
      }
    }
  }

  return params;

};

const buildQueryStringFromParams = params => {

  let querystring = '?';

  for (const key in params) {
    querystring += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]) + '&';
  }

  if (querystring === '?') {
    querystring = '';
  } else if (querystring[querystring.length - 1] === '&') {
    querystring = querystring.substring(0, querystring.length - 1);
  }

  return querystring;

};

// ---------- Functions (require this) ----------

function reconcile(parentElement, currentArray, newArray, createFn, updateFn) {

  // optimized array reconciliation algorithm based on the following implementations
  // https://github.com/localvoid/ivi
  // https://github.com/adamhaile/surplus
  // https://github.com/Freak613/stage0

  // important: reconcile does not currently work with dynamically adding or removing elements that have $refAttributes

  let prevStart = 0, newStart = 0;
  let loop = true;
  let prevEnd = currentArray.length - 1, newEnd = newArray.length - 1;
  let a, b;
  let prevStartNode = parentElement.firstChild, newStartNode = prevStartNode;
  let prevEndNode = parentElement.lastChild, newEndNode = prevEndNode;
  let afterNode;

  // scan over common prefixes, suffixes, and simple reversals
  outer : while (loop) {

    loop = false;

    let _node;

    // Skip prefix
    a = currentArray[prevStart];
    b = newArray[newStart];

    while (a === b) {

      updateFn(prevStartNode, b);

      prevStart++;
      newStart++;

      newStartNode = prevStartNode = prevStartNode.nextSibling;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevStart];
      b = newArray[newStart];

    }

    // Skip suffix
    a = currentArray[prevEnd];
    b = newArray[newEnd];

    while (a === b) {

      updateFn(prevEndNode, b);

      prevEnd--;
      newEnd--;

      afterNode = prevEndNode;
      newEndNode = prevEndNode = prevEndNode.previousSibling;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevEnd];
      b = newArray[newEnd];

    }

    // Swap backward
    a = currentArray[prevEnd];
    b = newArray[newStart];

    while (a === b) {

      loop = true;
      updateFn(prevEndNode, b);

      _node = prevEndNode.previousSibling;
      parentElement.insertBefore(prevEndNode, newStartNode);
      newEndNode = prevEndNode = _node;

      newStart++;
      prevEnd--;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevEnd];
      b = newArray[newStart];

    }

    // Swap forward
    a = currentArray[prevStart];
    b = newArray[newEnd];

    while (a === b) {

      loop = true;

      updateFn(prevStartNode, b);

      _node = prevStartNode.nextSibling;
      parentElement.insertBefore(prevStartNode, afterNode);
      afterNode = newEndNode = prevStartNode;
      prevStartNode = _node;

      prevStart++;
      newEnd--;

      if (prevEnd < prevStart || newEnd < newStart) {
        break outer;
      }

      a = currentArray[prevStart];
      b = newArray[newEnd];

    }

  }

  // Remove Node(s)
  if (newEnd < newStart) {
    if (prevStart <= prevEnd) {
      let next;
      while (prevStart <= prevEnd) {
        if (prevEnd === 0) {
          parentElement.removeChild(prevEndNode);
        } else {
          next = prevEndNode.previousSibling;
          parentElement.removeChild(prevEndNode);
          prevEndNode = next;
        }
        prevEnd--;
      }
    }
    return;
  }

  // Add Node(s)
  if (prevEnd < prevStart) {
    if (newStart <= newEnd) {
      while (newStart <= newEnd) {
        afterNode
          ? parentElement.insertBefore(createFn(newArray[newStart], newStart, newArray), afterNode)
          : parentElement.appendChild(createFn(newArray[newStart], newStart, newArray));
        newStart++;
      }
    }
    return;
  }

  // Simple cases don't apply. Prepare full reconciliation:

  // Collect position index of nodes in current DOM
  const positions = new Array(newEnd + 1 - newStart);
  // Map indices of current DOM nodes to indices of new DOM nodes
  const indices = new Map();

  let i;

  for (i = newStart; i <= newEnd; i++) {
    positions[i] = -1;
    indices.set(newArray[i], i);
  }

  let reusable = 0, toRemove = [];

  for (i = prevStart; i <= prevEnd; i++) {

    if (indices.has(currentArray[i])) {
      positions[indices.get(currentArray[i])] = i;
      reusable++;
    } else {
      toRemove.push(i);
    }

  }

  // Full Replace
  if (reusable === 0) {

    parentElement.textContent = '';

    for (i = newStart; i <= newEnd; i++) {
      parentElement.appendChild(createFn(newArray[i], i, newArray));
    }

    return;

  }

  // Full Patch around longest increasing sub-sequence
  const snake = subSequence(positions, newStart);

  // gather nodes
  const nodes = [];
  let tmpC = prevStartNode;

  for (i = prevStart; i <= prevEnd; i++) {
    nodes[i] = tmpC;
    tmpC = tmpC.nextSibling;
  }

  for (i = 0; i < toRemove.length; i++) {
    parentElement.removeChild(nodes[toRemove[i]]);
  }

  let snakeIndex = snake.length - 1, tempNode;
  for (i = newEnd; i >= newStart; i--) {

    if (snake[snakeIndex] === i) {

      afterNode = nodes[positions[snake[snakeIndex]]];
      updateFn(afterNode, newArray[i]);
      snakeIndex--;

    } else {

      if (positions[i] === -1) {
        tempNode = createFn(newArray[i], i, newArray);
      } else {
        tempNode = nodes[positions[i]];
        updateFn(tempNode, newArray[i]);
      }

      parentElement.insertBefore(tempNode, afterNode);
      afterNode = tempNode;

    }

  }

}

function forbiddenProxySet(target, key, value) {
  throw new Error(`Can not change data in reactions: this.${key} = ${value} has been ignored.`);
}

const CACHE_STORAGE = (() => {
  try {
    window.localStorage.setItem('CUE_CACHE::TEST', '1');
    window.localStorage.removeItem('CUE_CACHE::TEST');
    return window.localStorage;
  } catch (e) {
    return {
      _data: {},
      setItem(key, val) {
        this._data[key] = val;
      },
      getItem(key) {
        return this._data[key] || null;
      },
      removeItem(key) {
        delete this._data[key];
      }
    };
  }
})();

const PENDING_CALLS = new Map();
const ALL_KEYS = 'CUE_SERVER_CACHE::KEYS';
const EMPTY_CACHE_STORAGE_KEY = Symbol();

let PENDING_REQUEST_EVENT = null;

const Server = {

  get(url, expires = 0, token) {

    return new Promise((resolve, reject) => {

      fireRequestStart();

      const hash = hashString(url);
      const data = getCache(hash);

      if (data === EMPTY_CACHE_STORAGE_KEY) {
        makeCall(url, 'GET', token).then(response => {
          expires > 0 && setCache(hash, response, expires);
          resolve(response);
        }).catch(error => {
          reject(error);
        }).finally(fireRequestStop);
      } else {
        fireRequestStop();
        resolve(data);
      }

    });

  },

  post(url, data, token) {
    return new Promise((resolve, reject) => {
      fireRequestStart();
      makeCall(url, 'POST', token, data)
        .then(response => resolve(response))
        .catch(error => reject(error))
        .finally(fireRequestStop);
    });
  },

  put(url, data, token) {
    return new Promise((resolve, reject) => {
      fireRequestStart();
      makeCall(url, 'PUT', token, data)
        .then(response => resolve(response))
        .catch(error => reject(error))
        .finally(fireRequestStop);
    });
  },

  delete(url, data, token) {
    return new Promise((resolve, reject) => {
      fireRequestStart();
      makeCall(url, 'DELETE', token, data)
        .then(response => resolve(response))
        .catch(error => reject(error))
        .finally(fireRequestStop);
    });
  },

  clearCache(url) {
    clearCache(hashString(url));
  },

  onRequestStart() {
    // overwrite externally
  },

  onRequestStop(handler) {
    // overwrite externally
  }

};

// --------------------------------------------------------

function setCache(hash, value, expires) {

  const now = Date.now();
  const schedule = now + expires * 1000;

  if (typeof value === 'object') value = JSON.stringify(value);

  const url_stamped = `${hash}::ts`;
  CACHE_STORAGE.setItem(hash, value);
  CACHE_STORAGE.setItem(url_stamped, `${schedule}`);

  let allKeys = CACHE_STORAGE.getItem(ALL_KEYS);
  if (allKeys === null) {
    allKeys = `${hash},${url_stamped},`;
  } else if (allKeys.indexOf(`${hash},`) === -1) {
    allKeys = `${allKeys}${hash},${url_stamped},`;
  }

  CACHE_STORAGE.setItem(ALL_KEYS, allKeys);

}

function getCache(hash) {

  const timestamp = CACHE_STORAGE.getItem(`${hash}::ts`);

  if (timestamp === null) {
    return EMPTY_CACHE_STORAGE_KEY;
  } else {
    if (Number(timestamp) < Date.now()) {
      clearCache(hash);
      return EMPTY_CACHE_STORAGE_KEY;
    } else {
      try {
        return JSON.parse(CACHE_STORAGE.getItem(hash));
      } catch (e) {
        return CACHE_STORAGE.getItem(hash);
      }
    }
  }

}

function clearCache(hash) {
  if (hash) {
    if (CACHE_STORAGE.getItem(hash) !== null) {
      const url_stamped = `${hash}::ts`;
      CACHE_STORAGE.removeItem(hash);
      CACHE_STORAGE.removeItem(url_stamped);
      const _allKeys = CACHE_STORAGE.getItem(ALL_KEYS);
      if (_allKeys !== null) {
        const allKeys = _allKeys.split(',');
        allKeys.splice(allKeys.indexOf(hash), 1);
        allKeys.splice(allKeys.indexOf(url_stamped), 1);
        CACHE_STORAGE.setItem(ALL_KEYS, `${allKeys.join(',')},`);
      }
    }
  } else {
    const _allKeys = CACHE_STORAGE.getItem(ALL_KEYS);
    if (_allKeys !== null) {
      const allKeys = _allKeys.split(',');
      for (let i = 0; i < allKeys.length; i++) {
        CACHE_STORAGE.removeItem(allKeys[i]);
      }
      CACHE_STORAGE.removeItem(ALL_KEYS);
    }
  }
}

function makeCall(url, method, token, data = {}) {

  if (PENDING_CALLS.has(url)) {

    return PENDING_CALLS.get(url);

  } else {

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    PENDING_CALLS.set(url, new Promise((resolve, reject) => {

      fetch(url, {
        method: method,
        mode: 'cors',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: headers,
        redirect: 'follow',
        referrer: 'no-referrer',
        body: method === 'GET' ? null : typeof data === 'string' ? data : JSON.stringify(data)
      }).then(res => {
        if (!res.ok) {
          handleAsTextOrJSON(res, reject);
        } else {
          if (res.status === 204) {
            resolve({});
          } else {
            handleAsTextOrJSON(res, resolve);
          }
        }
      }).catch(error => {
        reject(error);
      }).finally(() => {
        PENDING_CALLS.delete(url);
      });

    }));

    return PENDING_CALLS.get(url);

  }

}

function handleAsTextOrJSON(res, next) {
  res.text().then(text => {
    try { next(JSON.parse(text)); } catch (_) { next(text); }
  });
}

function fireRequestStart() {
  clearTimeout(PENDING_REQUEST_EVENT);
  Server.onRequestStart();
}

function fireRequestStop() {
  PENDING_REQUEST_EVENT = setTimeout(() => {
    Server.onRequestStop();
  }, 100);
}

const EVENTS = new Map();
const CALLBACKS = new Map();
const COMPUTED_PROPERTIES = new Map();
const DEPENDENCIES = new Map();
const RESOLVED = [];

let SCHEDULED_REACTION = null;

const Reactor = {

  cueEvent(eventHandler, value) {
    EVENTS.set(eventHandler, value);
  },

  cueCallback(handler, value) {
    CALLBACKS.set(handler, value);
  },

  cueComputations(dependencyGraph, callbacks, key, dataSource) {
    const computedProperties = dependencyGraph.get(key);
    const context = [dependencyGraph, callbacks, dataSource];
    for (let i = 0; i < computedProperties.length; i++) {
      COMPUTED_PROPERTIES.set(computedProperties[i], context);
    }
  },

  react() {
    cancelAnimationFrame(SCHEDULED_REACTION);
    SCHEDULED_REACTION = requestAnimationFrame(flushReactionBuffer);
  }

};

// ----------------------------------------

function flushReactionBuffer() {

  let i, tuple, deps, computedProperty, context, callbacks, dependencyGraph, result;

  for (tuple of EVENTS.entries()) {
    tuple[0](tuple[1]);
  }

  // RESOLVE COMPUTED_PROPERTIES ------------>
  while (COMPUTED_PROPERTIES.size > 0) {

    for (tuple of COMPUTED_PROPERTIES.entries()) {

      computedProperty = tuple[0];

      if (RESOLVED.indexOf(computedProperty) === -1) {

        context = tuple[1];

        dependencyGraph = context[0];
        callbacks = context[1];

        computedProperty.needsUpdate = true;
        result = computedProperty.value(context[2]); // context[2] === dataSource

        if (computedProperty.hasChanged === true) {

          if (callbacks[computedProperty.ownPropertyName]) {
            CALLBACKS.set(callbacks[computedProperty.ownPropertyName], result);
          }

          DEPENDENCIES.set(computedProperty, context);

        }

        RESOLVED.push(computedProperty);

      }

    }

    COMPUTED_PROPERTIES.clear();

    for (tuple of DEPENDENCIES.entries()) {

      computedProperty = tuple[0];
      context = tuple[1];
      deps = context[0].get(computedProperty.ownPropertyName); // context[0] === dependencyGraph

      if (deps) {
        for (i = 0; i < deps.length; i++) {
          COMPUTED_PROPERTIES.set(deps[i], context);
        }
      }

    }

    DEPENDENCIES.clear();

  }

  // CALLBACKS ----------->
  for (tuple of CALLBACKS.entries()) {
    tuple[0](tuple[1]);
  }

  // RESET BUFFERS -------->
  EVENTS.clear();
  CALLBACKS.clear();

  while(RESOLVED.length > 0) {
    RESOLVED.pop();
  }

}

const getStorageKey = (name, key) =>  name + '.' + key + '::CueStore';
const jsonReplacer = (key, value) => value === undefined ? null : value;

const ALL_STORES = new Map();
const INTERNAL = Symbol('Cue.Store.internals');

const STORE_BINDING_ID = Symbol('Cue.Store');
const INTERNAL_STORE_SET = Symbol('Cue.Store.set');
const INTERNAL_STORE_GET = Symbol('Cue.Store.get');
const INTERNAL_STORE_DISPATCH = Symbol('Cue.Store.dispatch');

class CueStoreBinding {

  constructor(store, key) {
    this.id = STORE_BINDING_ID;
    this.store = store;
    this.key = key;
  }

  get() {
    return this.store[INTERNAL].data[this.key];
  }

  set(value) {
    this.store[INTERNAL].data[this.key] = value;
    this.store[INTERNAL_STORE_DISPATCH](this.key, value);
  }

}

class CueStore {

  constructor(name, data, storage = null) {

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
      internal.data = data;

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
      return internal.data;
    }

    return internal.data[key];

  }

  getInitial(key) {
    if (!key) {
      return deepClone(this[INTERNAL].defaultData);
    } else {
      return deepClone(this[INTERNAL].defaultData[key]);
    }
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

const Store = {

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

const DATA_TYPE_UNDEFINED = -1;
const DATA_TYPE_PRIMITIVE = 0;
const DATA_TYPE_ARRAY = 1;
const DATA_TYPE_OBJECT = 2;

const COMP_INSTALLER = {
  computedProperty: null,
  computedProperties: null
};

let resolver_source = null;
let resolver_visited = [];

class ComputedProperty {

  constructor(ownPropertyName, computation, sourceProperties = []) {

    this.ownPropertyName = ownPropertyName;
    this.computation = computation; // the function that computes a result from data points on the source
    
    // Dependency Graph
    this.sourceProperties = sourceProperties; // property names this computedProperty depends on

    // Value Cache
    this.intermediate = void 0; // intermediate computation result
    this._value = void 0; // current computation result
    this._type = DATA_TYPE_UNDEFINED; // optimization flag

    // Optimization flags
    this.needsUpdate = true; // flag indicating that one or many dependencies have been updated and value needs re-compute (used by this.value)
    this.hasChanged = false; // flag indicating that the computation has yielded a new result (used by reactor)

  }

  value(source) {

    if (this.needsUpdate === true) { // re-compute because dependencies have updated

      // call computation with this = component.data, first argument = component.data, second argument = current value
      this.intermediate = this.computation.call(source, source, this._value);

      if (Array.isArray(this.intermediate)) {

        if ((this.hasChanged = this._type !== DATA_TYPE_ARRAY || !areArraysShallowEqual(this._value, this.intermediate))) {
          this._value = this.intermediate.slice();
          this._type = DATA_TYPE_ARRAY;
        }

      } else if (typeof this.intermediate === 'object' && this.intermediate !== null) {

        if ((this.hasChanged = this._type !== DATA_TYPE_OBJECT || !arePlainObjectsShallowEqual(this._value, this.intermediate))) {
          this._value = Object.assign({}, this.intermediate);
          this._type = DATA_TYPE_OBJECT;
        }

      } else if ((this.hasChanged = this._value !== this.intermediate)) {

        this._value = this.intermediate;
        this._type = DATA_TYPE_PRIMITIVE;

      }

      this.needsUpdate = false;

    }

    return this._value;

  }

}

function setupComputedProperties(allProperties, computedProperties) {
  return resolveDependencies(installDependencies(allProperties, computedProperties));
}

function buildDependencyGraph(computedProperties) {

  const dependencyGraph = new Map();

  let computedProperty, i, sourceProperty;

  for (computedProperty of computedProperties.values()) {

    for(i = 0; i < computedProperty.sourceProperties.length; i++) {
      sourceProperty = computedProperty.sourceProperties[i];

      if (dependencyGraph.has(sourceProperty)) {
        dependencyGraph.get(sourceProperty).push(computedProperty);
      } else {
        dependencyGraph.set(sourceProperty, [ computedProperty ]);
      }

    }

  }

  return dependencyGraph;

}

// -------------------------------------------

function installDependencies(allProperties, computedProperties) {

  // set the current installer payload
  Object.assign(COMP_INSTALLER, {
    computedProperties: computedProperties
  });

  // intercept get requests to props object to grab sourceProperties
  const installer = new Proxy(allProperties, {
    get: dependencyGetInterceptor
  });

  // call each computation which will trigger the intercepted get requests
  let computedProperty;
  for (computedProperty of computedProperties.values()) {

    COMP_INSTALLER.computedProperty = computedProperty;

    try {
      // the computation itself will most definitely fail but we only care about the property dependencies so we can safely ignore all errors.
      computedProperty.computation.call(installer, installer);
    } catch(e) {
      if (e.type && e.type === 'cue-internal') {
        throw new Error(e.message);
      }
    }

  }

  // kill pointers
  COMP_INSTALLER.computedProperty = null;
  COMP_INSTALLER.computedProperties = null;

  return computedProperties;

}

function resolveDependencies(computedProperties) {

  resolver_source = computedProperties;

  const target = new Map();

  let sourceProperty;
  for (sourceProperty of computedProperties.keys()) {
    visitDependency(sourceProperty, [], target);
  }

  resolver_source = null;
  resolver_visited = [];

  return target;

}

function dependencyGetInterceptor(target, sourceProperty) {

  const {computedProperty} = COMP_INSTALLER;

  if (!target.hasOwnProperty(sourceProperty)) {
    throw {
      type: 'cue-internal',
      message: `Cannot resolve computed property "${computedProperty.ownPropertyName}" because dependency "${sourceProperty}" doesn't exist.`
    };
  }

  // add the property as a sourceProperty to the computedProperty
  if (computedProperty.sourceProperties.indexOf(sourceProperty) === -1) {
    computedProperty.sourceProperties.push(sourceProperty);
  }

}

function visitDependency(sourceProperty, dependencies, target) {

  if (resolver_source.has(sourceProperty)) {

    dependencies.push(sourceProperty);
    resolver_visited.push(sourceProperty);

    const computedProperty = resolver_source.get(sourceProperty);

    for (let i = 0, name; i < computedProperty.sourceProperties.length; i++) {

      name = computedProperty.sourceProperties[i];

      if (dependencies.indexOf(name) !== -1) {
        throw new Error(`Circular dependency. "${computedProperty.ownPropertyName}" is required by "${name}": ${dependencies.join(' -> ')}`);
      }

      if (resolver_visited.indexOf(name) === -1) {
        visitDependency(name, dependencies, target);
      }

    }

    if (!target.has(sourceProperty)) {
      target.set(sourceProperty, computedProperty);
    }

  }

}

// --------------- COMPONENT GLOBALS -------------

// Regex matches when $self is:
// - immediately followed by css child selector (space . : # [ > + ~) OR
// - immediately followed by opening bracket { OR
// - immediately followed by chaining comma ,
// - not followed by anything (end of line)
const SELF_REGEXP = /(\$self(?=[\\040,{.:#[>+~]))|\$self\b/g;
const CHILD_SELECTORS = [' ','.',':','#','[','>','+','~'];

let UID = -1;

const DEFINED_COMPONENTS = new Set();
const COMP_DATA_CACHE = new Map();
const COMP_INIT_CACHE = new Map();
const COMP_METHOD_CACHE = new Map();
const SLOT_MARKUP_CACHE = new Map();

const INTERNAL$1 = Symbol('Component Data');

const TMP_DIV = document.createElement('div');

const CUE_CSS = {
  compiler: document.getElementById('cue::compiler') || Object.assign(document.head.appendChild(document.createElement('style')), {id: 'cue::compiler'}),
  components: document.getElementById('cue::components') || Object.assign(document.head.appendChild(document.createElement('style')), {id: 'cue::components'})
};

// --------------- HTML UTILITIES -------------

const queryInElementBoundary = (root, selector, collection = []) => {

  for (let i = 0, child; i < root.children.length; i++) {

    child = root.children[i];

    if (child.hasAttribute(selector)) {
      collection.push(child);
    }

    if (!DEFINED_COMPONENTS.has(child.tagName)) {
      queryInElementBoundary(child, selector, collection);
    }

  }

  return collection;

};

const collectElementReferences = (root, refNames) => {

  for (let i = 0, child, ref, cls1, cls2; i < root.children.length; i++) {

    child = root.children[i];

    ref = child.getAttribute('$');

    if (ref) {
      cls1 = child.getAttribute('class');
      cls2 = ref + ++UID;
      refNames['$' + ref] = '.' + cls2;
      child.setAttribute('class', cls1 ? cls1 + ' ' + cls2 : cls2);
      child.removeAttribute('$');
    }

    if (!DEFINED_COMPONENTS.has(child.tagName)) {
      collectElementReferences(child, refNames);
    }

  }

  return refNames;

};

const createComponentMarkup = (openTag, innerHTML, closeTag, attributes) => {

  let htmlString = openTag;
  let instanceMethods = null;

  for (const att in attributes) {

    const val = attributes[att];

    if (typeof val === 'string') {

      htmlString += ' ' + att + '="' + val + '"';

    } else {

      ++UID;
      const uid = '' + UID;

      if (att === 'data') {
        COMP_DATA_CACHE.set(uid, val);
        htmlString += ' cue-data="' + uid + '"';
      } else if (att === 'slots') {
        SLOT_MARKUP_CACHE.set(uid, val);
        htmlString += ' cue-slot="' + uid + '"';
      } else if (att === 'initialize') {
        COMP_INIT_CACHE.set(uid, val);
        htmlString += ' cue-init="' + uid + '"';
      } else if (typeof val === 'function') {
        instanceMethods || (instanceMethods = {});
        instanceMethods[att] = val;
      }

    }

  }

  if (instanceMethods) {
    ++UID;
    const uid = '' + UID;
    COMP_METHOD_CACHE.set(uid, instanceMethods);
    htmlString += ' cue-func="' + uid + '"';
  }

  htmlString += '>' + innerHTML + closeTag;

  return htmlString;

};

// --------------- CUSTOM ELEMENT BASE CLASSES -------------

class CueModule {

  constructor(name, config) {

    this.name = name;
    this.ready = false;

    // --------------- PREPARE ELEMENT TEMPLATE --------------
    // this has to be done early so that ref-ready template.innerHTML
    // can be composed via string factory returned from Component.define
    this.template = document.createElement('template');
    this.template.innerHTML = config.element || '';
    this.refNames = collectElementReferences(this.template.content, {});

  }

  setupOnce(config) {

    if (this.ready === false) {

      this.ready = true;

      // ------------------ COMPLETE TEMPLATE -----------------
      this.template.__slots = {};
      this.template.__hasSlots = false;

      const slots = this.template.content.querySelectorAll('slot');
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        this.template.__slots[slot.getAttribute('name')] = slot.outerHTML;
        this.template.__hasSlots = true;
      }

      // ------------------ CREATE SCOPED CSS ------------------
      config.style = config.style || config.styles; // allow both names
      if (config.style) {
        this.style = this.createScopedStyles(config.style);
        CUE_CSS.components.innerHTML += this.style;
      }

      // ----------------- SETUP DATA, COMPUTED & REACTIONS --------------

      this.data = {
        static: {},
        computed: new Map(),
        bindings: {},
        reactions: {}
      };

      // Assign Data from Config
      const allProperties = {};

      if (config.data) {

        for (const k in config.data) {

          const v = config.data[k];

          allProperties[k] = v.value;

          if (v.value && v.value.id === STORE_BINDING_ID) {
            this.data.bindings[k] = v.value;
          } else if (typeof v.value === 'function') {
            this.data.computed.set(k, new ComputedProperty(k, v.value));
          } else {
            this.data.static[k] = v.value;
          }

          if (typeof v.reaction === 'function') {
            this.data.reactions[k] = v.reaction;
          }

        }

      }

      // Setup Computed Properties if assigned
      if (this.data.computed.size) {
        this.data.computed = setupComputedProperties(allProperties, this.data.computed);
      }

      // ---------------------- LIFECYCLE METHODS ----------------------
      this.initialize = typeof config.initialize === 'function' ? config.initialize : NOOP;

    }

  }

  createScopedStyles(styles) {

    // Re-write $self to component-name
    styles = styles.replace(SELF_REGEXP, this.name);

    // Re-write $refName(s) in style text to class selector
    for (const refName in this.refNames) {
      // replace $refName with internal .class when $refName is:
      // - immediately followed by css child selector (space . : # [ > + ~) OR
      // - immediately followed by opening bracket { OR
      // - immediately followed by chaining comma ,
      // - not followed by anything (end of line)
      styles = styles.replace(new RegExp("(\\" + refName + "(?=[\\40{,.:#[>+~]))|\\" + refName + "\b", 'g'), this.refNames[refName]);
    }

    CUE_CSS.compiler.innerHTML = styles;
    const tmpSheet = CUE_CSS.compiler.sheet;

    let styleNodeInnerHTML = '', styleQueries = '';
    for (let i = 0, rule; i < tmpSheet.rules.length; i++) {

      rule = tmpSheet.rules[i];

      if (rule.type === 7 || rule.type === 8) { // do not scope @keyframes
        styleNodeInnerHTML += rule.cssText;
      } else if (rule.type === 1) { // style rule
        styleNodeInnerHTML += this.constructScopedStyleRule(rule);
      } else if (rule.type === 4 || rule.type === 12) { // @media/@supports query
        styleQueries += this.constructScopedStyleQuery(rule);
      } else {
        console.warn(`CSS Rule of type "${rule.type}" is not currently supported by Cue Components.`);
      }

    }

    // write queries to the end of the rules AFTER the other rules for specificity (issue #13)
    styleNodeInnerHTML += styleQueries;

    // Empty Compiler styleSheet
    CUE_CSS.compiler.innerHTML = '';

    return styleNodeInnerHTML;

  }

  constructScopedStyleQuery(query, cssText = '') {

    if (query.type === 4) {
      cssText += '@media ' + query.media.mediaText + ' {';
    } else {
      cssText += '@supports ' + query.conditionText + ' {';
    }

    let styleQueries = '';

    for (let i = 0, rule; i < query.cssRules.length; i++) {

      rule = query.cssRules[i];

      if (rule.type === 7 || rule.type === 8) { // @keyframes
        cssText += rule.cssText;
      } else if (rule.type === 1) {
        cssText += this.constructScopedStyleRule(rule, cssText);
      } else if (rule.type === 4 || rule.type === 12) { // nested query
        styleQueries += this.constructScopedStyleQuery(rule);
      } else {
        console.warn(`CSS Rule of type "${rule.type}" is not currently supported by Components.`);
      }

    }

    // write nested queries to the end of the surrounding query (see issue #13)
    cssText += styleQueries + ' }';

    return cssText;

  }

  constructScopedStyleRule(rule) {

    let cssText = '';

    if (rule.selectorText.indexOf(',') > -1) {

      const selectors = rule.selectorText.split(',');
      const scopedSelectors = [];

      for (let i = 0, selector; i < selectors.length; i++) {

        selector = selectors[i].trim();

        if (selector.lastIndexOf(':root', 0) === 0) { // escape context (dont scope) :root notation
          scopedSelectors.push(selector.replace(':root', ''));
        } else if (this.isTopLevelSelector(selector, this.name)) { // dont scope component-name
          scopedSelectors.push(selector);
        } else { // prefix with component-name to create soft scoping
          scopedSelectors.push(this.name + ' ' + selector);
        }

      }

      cssText += scopedSelectors.join(', ') + rule.cssText.substr(rule.selectorText.length);

    } else {

      if (rule.selectorText.lastIndexOf(':root', 0) === 0) { // escape context (dont scope) :root notation
        cssText += rule.cssText.replace(':root', ''); // remove first occurrence of :root
      } else if (this.isTopLevelSelector(rule.selectorText)) { // dont scope component-name
        cssText += rule.cssText;
      } else { // prefix with component-name to create soft scoping
        cssText += this.name + ' ' + rule.cssText;
      }

    }

    return cssText;

  }

  isTopLevelSelector(selectorText) {
    if (selectorText === this.name) {
      return true;
    } else if (selectorText.lastIndexOf(this.name, 0) === 0) { // starts with componentName
      return CHILD_SELECTORS.indexOf(selectorText.charAt(this.name.length)) > -1; // character following componentName is valid child selector
    } else { // nada
      return false;
    }
  }

}

class CueElement extends HTMLElement {

  constructor(module, config) {

    super();

    // Setup base module the first time this component is built
    module.setupOnce(config);

    // ---------------------- INSTANCE INTERNALS ----------------------

    const internal = this[INTERNAL$1] = {
      module: module,
      reactions: {},
      computedProperties: new Map(),
      subscriptions: [],
      refs: {},
      initialized: false,
      dataEvent: new CustomEvent('data', {
        bubbles: true,
        cancelable: true,
        detail: {
          key: '',
          value: void 0
        }
      })
    };

    // ---------------------- INSTANCE DATA SETUP ----------------------

    const computedProperties = internal.computedProperties;

    internal._data = deepClone(module.data.static);
    internal.data = new Proxy({}, {
      set: forbiddenProxySet,
      get(_, key) {
        if (module.data.bindings[key]) return module.data.bindings[key].get();
        if (computedProperties.has(key)) return computedProperties.get(key).value(internal.data);
        return internal._data[key];
      }
    });

    // Clone Computed Properties
    if (module.data.computed.size) {
      for (const tuple of module.data.computed.entries()) {
        const val = tuple[1];
        computedProperties.set(tuple[0], new ComputedProperty(val.ownPropertyName, val.computation, val.sourceProperties));
      }
    }

    // Build Dependency Graph
    internal.dependencyGraph = buildDependencyGraph(internal.computedProperties);

    // Bind reactions with first argument as "refs" object, second argument the current value and third argument the entire "data" object
    for (const key in module.data.reactions) {
      internal.reactions[key] = value => {
        module.data.reactions[key](internal.refs, value, internal.data);
      };
    }

  }

  connectedCallback() {

    // when this element is a slotted element, wait until it is composed
    if (this.hasAttribute('slot')) {
      return;
    }

    const internal = this[INTERNAL$1];
    const module = internal.module;

    // ------------- INSTANCE INIT ------------
    // (only run after initial construction, never on re-connect)
    if (internal.initialized === false) {

      internal.initialized = true;

      // ----------- INSERT DOM AND ASSIGN REFS ----------
      if (module.template.__hasSlots) {

        // find slotted children in this instance
        let slots = null;

        if (this.hasAttribute('cue-slot')) {

          const uid = this.getAttribute('cue-slot');
          slots = SLOT_MARKUP_CACHE.get(uid);

        } else if (this.innerHTML) {

          const slottedChildren = this.querySelectorAll('[slot]');

          for (let i = 0; i < slottedChildren.length; i++) {
            const slottedChild = slottedChildren[i];
            slots || (slots = {});
            slots[slottedChild.getAttribute('slot')] = slottedChild.outerHTML;
          }

        }

        // insert slotted children into template
        if (slots) {

          let templateHTML = module.template.innerHTML;
          let hasSlottedChildren = false;

          for (const slotName in slots) {
            if (module.template.__slots[slotName]) {
              hasSlottedChildren = true;
              templateHTML = templateHTML.replace(module.template.__slots[slotName], slots[slotName]);
            }
          }

          this.innerHTML = templateHTML;

          // collect refs from composed slots
          if (hasSlottedChildren) {
            collectElementReferences(this, module.refNames);
          }

        } else { // No slotted children found - render template only (keep empty slots in markup)

          this.innerHTML = module.template.innerHTML;

        }

      } else { // Template has no Slots - render template only

        this.innerHTML = module.template.innerHTML;

      }

      // ---------------- ASSIGN REF ELEMENTS
      for (const refName in module.refNames) {
        const el = this.querySelector(module.refNames[refName]);
        if (el) {
          if (!el[INTERNAL$1]) {
            el[INTERNAL$1] = {};
            el.renderEach = this.renderEach; // give every ref element fast list rendering method
          }
          internal.refs[refName] = el; // makes ref available as $refName in js
        }
      }

      internal.refs['$self'] = this; // this === $self for completeness

      // ----------------- Compose attribute data into internal data model
      if (this.hasAttribute('cue-data')) {
        const uid = this.getAttribute('cue-data');
        const providedData = COMP_DATA_CACHE.get(uid);
        const internalClone = deepClone(internal._data);
        const providedDataClone = deepClone(providedData);
        internal._data = providedData; // switch pointer
        Object.assign(internal._data, internalClone, providedDataClone);
      }

      // ---------------- Add Composed Methods to Prototype (if any)
      if (this.hasAttribute('cue-func')) {
        const uid = this.getAttribute('cue-func');
        const methods = COMP_METHOD_CACHE.get(uid);
        for (const method in  methods) {
          CueElement.prototype[method] = methods[method];
        }
      }

      // ---------------- Cue Reactions
      for (const key in internal.reactions) {
        Reactor.cueCallback(internal.reactions[key], internal.data[key]);
      }

      // ---------------- Trigger First Render
      Reactor.react();

      // ---------------- Initialize after First Render
      requestAnimationFrame(() => {

        module.initialize.call(this, internal.refs);

        // ---------------- Call Inherited Initialize Functions (if any)
        if (this.hasAttribute('cue-init')) {
          const uid = this.getAttribute('cue-init');
          const initialize = COMP_INIT_CACHE.get(uid);
          initialize.call(this, internal.refs);
        }

      });

    }

    // Add Store Subscriptions on every connect callback - unbind in disconnectedCallback
    for (const key in module.data.bindings) {

      // Computation Subscriptions
      internal.dependencyGraph.has(key) && internal.subscriptions.push(module.data.bindings[key].store.subscribe(
        module.data.bindings[key].key,
        () => Reactor.cueComputations(internal.dependencyGraph, internal.reactions, key, internal.data)
      ));

      // Reaction Subscriptions
      internal.reactions[key] && internal.subscriptions.push(module.data.bindings[key].store.subscribe(
        module.data.bindings[key].key,
        internal.reactions[key]
      ));

    }

  }

  disconnectedCallback() {

    const internal = this[INTERNAL$1];
    const subscriptions = internal.subscriptions;
    while (subscriptions.length) {
      subscriptions.pop().unsubscribe();
    }

  }

  getData(key) {

    if (!key) {
      // when no key is passed, retrieve object of all settable properties (all except computed)
      const internal = this[INTERNAL$1];
      const dataClone = {};
      let key;

      for (key in internal.module.data.bindings) {
        dataClone[key] = internal.module.data.bindings[key].get();
      }

      for (key in internal._data) {
        dataClone[key] = internal._data[key];
      }

      return dataClone;

    }

    return this[INTERNAL$1].data[key];

  }

  setData(key, value) {

    if (typeof key === 'object') {
      for (const prop in key) {
        this.setData(prop, key[prop]);
      }
    }

    const internal = this[INTERNAL$1];
    const module = internal.module;

    if (module.data.computed.has(key)) {
      throw new Error(`You can not set property "${key}" because it is a computed property.`);
    }

    if (module.data.bindings[key] && !deepEqual(module.data.bindings[key].get(false), value)) {

      internal.dataEvent.detail.key = key;
      internal.dataEvent.detail.value = deepClone(value);
      this.dispatchEvent(internal.dataEvent);

      module.data.bindings[key].set(value);

    } else if (!deepEqual(internal._data[key], value)) {

      internal._data[key] = value;

      internal.dataEvent.detail.key = key;
      internal.dataEvent.detail.value = deepClone(value);
      this.dispatchEvent(internal.dataEvent);

      if (internal.reactions[key]) {
        Reactor.cueCallback(internal.reactions[key], value);
      }

      if (internal.dependencyGraph.has(key)) {
        Reactor.cueComputations(internal.dependencyGraph, internal.reactions, key, internal.data);
      }

      Reactor.react();

    }

  }

  autoBind(attribute = 'data-bind') {

    const bindableElements = queryInElementBoundary(this, attribute);

    if (bindableElements.length) {
      this.addEventListener('input', e => {
        if (bindableElements.indexOf(e.target) > -1) {
          if (e.target.matches('input[type="checkbox"]')) {
            this.setData(e.target.getAttribute(attribute), e.target.checked ? 1 : 0);
          } else if (e.target.matches('select[multiple]')) {
            this.setData(e.target.getAttribute(attribute), Array.from(e.target.selectedOptions).map(el => el.value));
          } else {
            this.setData(e.target.getAttribute(attribute), e.target.value);
          }
        }
      });
    }

  }

  renderEach(dataArray, createElement, updateElement = NOOP) {

    // accept arrays, convert plain objects to arrays, convert null or undefined to array
    dataArray = Array.isArray(dataArray) ? dataArray : Object.values(dataArray || {});

    // this function is attached directly to dom elements. "this" refers to the element
    const previousData = this[INTERNAL$1].childData || [];
    this[INTERNAL$1].childData = dataArray;

    if (dataArray.length === 0) {
      this.innerHTML = '';
    } else if (previousData.length === 0) {
      for (let i = 0; i < dataArray.length; i++) {
        this.appendChild(createElement(dataArray[i], i, dataArray));
      }
    } else {
      reconcile(this, previousData, dataArray, createElement, updateElement);
    }

  }

}

// --------------- PUBLIC API -------------

const Component = {

  define(name, config) {

    const Module = new CueModule(name, config);

    // ---------------------- SETUP COMPONENT ----------------------
    class CueComponent extends CueElement {
      constructor() {
        super(Module, config);
      }
    }

    // ---------------------- ADD METHODS TO PROTOTYPE ----------------------
    for (const k in config) {
      if (typeof config[k] === 'function' && k !== 'initialize') {
        CueComponent.prototype[k] = config[k];
      }
    }

    // ---------------------- DEFINE CUSTOM ELEMENT ----------------------
    DEFINED_COMPONENTS.add(name.toUpperCase());
    customElements.define(name, CueComponent);

    // ----------------------- RETURN HTML FACTORY FOR EMBEDDING ELEMENT WITH ATTRIBUTES -----------------------
    const openTag = '<'+name, closeTag = '</'+name+'>';

    return (attributes = {}) => createComponentMarkup(openTag, Module.template.innerHTML, closeTag, attributes);

  },

  extend(component, config) {
    return (attributes = {}) => component(Object.assign(config, attributes));
  },

  create(node) {

    node = typeof node === 'function' ? node() : node;
    node = node.trim();

    if (typeof node !== 'string' || node[0] !== '<') {
      throw new Error('[Cue.js] - Component.create(node) -> argument "node" is not valid HTML: "' + node + '"');
    }

    TMP_DIV.innerHTML = node;
    return TMP_DIV.children[0];

  }

};

const ORIGIN = window.location.origin + window.location.pathname;
const ABSOLUTE_ORIGIN_NAMES = [ORIGIN, window.location.hostname, window.location.hostname + '/', window.location.origin];
if (ORIGIN[ORIGIN.length - 1] !== '/') ABSOLUTE_ORIGIN_NAMES.push(ORIGIN + '/');
if (window.location.pathname && window.location.pathname !== '/') ABSOLUTE_ORIGIN_NAMES.push(window.location.pathname);
const ALLOWED_ORIGIN_NAMES = ['/', '#', '/#', '/#/', ...ABSOLUTE_ORIGIN_NAMES];
const ORIGIN_URL = new URL(ORIGIN);
const CLEAN_ORIGIN = removeTrailingSlash(ORIGIN);

const REGISTERED_FILTERS = new Map();
const REGISTERED_ACTIONS = new Set();
const WILDCARD_ACTIONS = [];

let WILDCARD_FILTER = null;

const ROUTES_STRUCT = {};

const DEFAULT_TRIGGER_OPTIONS = {
  params: {},
  keepQuery: true,
  forceReload: false,
  history: 'pushState'
};

let HAS_POPSTATE_LISTENER = false;
let CURRENT_QUERY_PARAMETERS = buildParamsFromQueryString(window.location.search);
let CURRENT_ROUTE_FRAGMENTS = ['/'];
if (window.location.hash) {
  CURRENT_ROUTE_FRAGMENTS.push(...window.location.hash.split('/'));
}

const Router = {

  before(route, filter) {

    addPopStateListenerOnce();

    if (route === '*') {

      if (WILDCARD_FILTER !== null) {
        console.warn('[Cue.js] - Router.before(*, filter) - overwriting previously registered wildcard filter (*)');
      }

      WILDCARD_FILTER = filter;

    } else {

      const { hash } = getRouteParts(route);

      if (REGISTERED_FILTERS.has(hash)) {
        throw new Error(`[Cue.js] Router.beforeRoute() already has a filter for ${hash === '#' ? `${route} (root url)` : route}`);
      }

      REGISTERED_FILTERS.set(hash, filter);

    }

  },

  on(route, action) {

    addPopStateListenerOnce();

    if (route === '*') {

      if (WILDCARD_ACTIONS.indexOf(action) === -1) {
        WILDCARD_ACTIONS.push(action);
      }

    } else {

      const { hash } = getRouteParts(route);

      if (REGISTERED_ACTIONS.has(hash)) {
        throw new Error('[Cue.js] Router.onRoute() already has a action for "' + hash === '#' ? (route + ' (root url)') : route + '".');
      }

      REGISTERED_ACTIONS.add(hash);

      assignActionToRouteStruct(hash, action);

    }

  },

  hasFilter(route) {
    if (route === '*') {
      return WILDCARD_FILTER !== null;
    } else {
      const { hash } = getRouteParts(route);
      return REGISTERED_FILTERS.has(hash);
    }
  },

  hasAction(route) {
    if (route === '*') {
      return WILDCARD_ACTIONS.length > 0;
    } else {
      const { hash } = getRouteParts(route);
      return REGISTERED_ACTIONS.has(hash);
    }
  },

  navigate(route, options = {}) {

    if (route.lastIndexOf('http', 0) === 0 && route !== window.location.href) {
      return window.location.href = route;
    }

    const { hash, query, rel } = getRouteParts(route);

    options = Object.assign({}, DEFAULT_TRIGGER_OPTIONS, options);

    if (options.keepQuery === true) {
      Object.assign(CURRENT_QUERY_PARAMETERS, buildParamsFromQueryString(query));
    } else {
      CURRENT_QUERY_PARAMETERS = buildParamsFromQueryString(query);
    }

    // Filters
    if (WILDCARD_FILTER) { // 1.0 - Apply wildcard filter

      WILDCARD_FILTER(rel, CURRENT_QUERY_PARAMETERS, response => {

        if (response !== rel) {

          reRoute(response);

        } else {

          if (REGISTERED_FILTERS.has(hash)) { // 1.1 - Apply route filters

            REGISTERED_FILTERS.get(hash)(rel, CURRENT_QUERY_PARAMETERS, response => {

              if (response !== rel) {

                reRoute(response);

              } else {

                performNavigation(hash, query, options.keepQuery, options.history);

              }

            });

          } else {

            performNavigation(hash, query, options.keepQuery, options.history);

          }

        }

      });

    } else if (REGISTERED_FILTERS.has(hash)) { // 2.0 - Apply route filters

      REGISTERED_FILTERS.get(hash)(rel, CURRENT_QUERY_PARAMETERS, response => {

        if (response !== rel) {

          reRoute(response);

        } else {

          performNavigation(hash, query, options.keepQuery, options.history);

        }

      });

    } else {

      performNavigation(hash, query, options.keepQuery, options.history);

    }

  },

  resolve(options = {}) {
    // should be called once after all filters and actions are registered
    this.navigate(window.location.href, options);
  },

  getQueryParameters(key) {
    if (!key) {
      return Object.assign({}, CURRENT_QUERY_PARAMETERS);
    } else {
      return CURRENT_QUERY_PARAMETERS[key];
    }
  },

  addQueryParameters(key, value) {

    if (typeof value === 'undefined' && typeof key === 'object') {
      for (const k in key) {
        CURRENT_QUERY_PARAMETERS[k] = key[k];
      }
    } else {
      CURRENT_QUERY_PARAMETERS[key] = value;
    }

    updateQueryString();

  },

  setQueryParameters(params) {
    CURRENT_QUERY_PARAMETERS = deepClone(params);
    updateQueryString();
  },

  removeQueryParameters(key) {

    if (!key) {
      CURRENT_QUERY_PARAMETERS = {};
    } else if (Array.isArray(key)) {
      key.forEach(k => {
        if (CURRENT_QUERY_PARAMETERS[k]) {
          delete CURRENT_QUERY_PARAMETERS[k];
        }
      });
    } else if (CURRENT_QUERY_PARAMETERS[key]) {
      delete CURRENT_QUERY_PARAMETERS[key];
    }

    updateQueryString();

  }

};

function addPopStateListenerOnce() {

  if (!HAS_POPSTATE_LISTENER) {

    HAS_POPSTATE_LISTENER = true;

    // never fired on initial page load in all up-to-date browsers
    window.addEventListener('popstate', () => {
      Router.navigate(window.location.href, {
        history: 'replaceState',
        forceReload: false
      });
    });

  }

}

function performNavigation(hash, query, keepQuery, historyMode) {

  executeWildCardActions(hash);
  executeRouteActions(hash);

  ORIGIN_URL.hash = hash;
  ORIGIN_URL.search = keepQuery ? buildQueryStringFromParams(CURRENT_QUERY_PARAMETERS) : query;
  window.history[historyMode](null, document.title, ORIGIN_URL.toString());

}

function updateQueryString() {
  ORIGIN_URL.search = buildQueryStringFromParams(CURRENT_QUERY_PARAMETERS);
  window.history.replaceState(null, document.title, ORIGIN_URL.toString());
}

function reRoute(newRoute) {
  if (newRoute.lastIndexOf('http', 0) === 0) {
    return window.location.href = newRoute;
  } else {
    return Router.navigate(newRoute, {
      history: 'replaceState',
      forceReload: false
    });
  }
}

function executeWildCardActions(hash) {

  hash = hash === '#' ? '' : hash;
  const completePath =  CLEAN_ORIGIN + hash;

  for (let i = 0; i < WILDCARD_ACTIONS.length; i++) {
    WILDCARD_ACTIONS[i](completePath, CURRENT_QUERY_PARAMETERS);
  }

}

function executeRouteActions(hash) {

  const routeFragments = ['/'];

  if (hash !== '#') {
    routeFragments.push(...hash.split('/'));
  }

  // find the intersection between the last route and the next route
  const intersection = getArrayIntersection(CURRENT_ROUTE_FRAGMENTS, routeFragments);

  // recompute the last intersecting fragment + any tail that might have been added
  const fragmentsToRecompute = [intersection[intersection.length - 1]];

  if (routeFragments.length > intersection.length) {
    fragmentsToRecompute.push(...getArrayTail(intersection, routeFragments));
  }

  // find the first node that needs to be recomputed
  let currentRouteNode = ROUTES_STRUCT;
  let fragment;

  for (let i = 0; i < intersection.length; i ++) {

    fragment = intersection[i];

    if (fragment === fragmentsToRecompute[0]) { // detect overlap
      fragment = fragmentsToRecompute.shift(); // remove first element (only there for overlap detection)
      break;
    } else {
      currentRouteNode = currentRouteNode[fragment].children;
    }

  }

  // execute actions
  while (currentRouteNode[fragment] && fragmentsToRecompute.length) {

    // call action with joined remaining fragments as "path" argument
    if (currentRouteNode[fragment].action) {
      currentRouteNode[fragment].action(fragmentsToRecompute.join('/'), CURRENT_QUERY_PARAMETERS);
    }

    currentRouteNode = currentRouteNode[fragment].children;
    fragment = fragmentsToRecompute.shift();

  }

  // execute last action with single trailing slash as "path" argument
  if (currentRouteNode[fragment] && currentRouteNode[fragment].action) {
    currentRouteNode[fragment].action('/', CURRENT_QUERY_PARAMETERS);
  }

  // update current route fragments
  CURRENT_ROUTE_FRAGMENTS = routeFragments;

}

function assignActionToRouteStruct(hash, action) {

  // create root struct if it doesnt exist
  const structOrigin = ROUTES_STRUCT['/'] || (ROUTES_STRUCT['/'] = {
    action: void 0,
    children: {}
  });

  // register the route structurally so that its callbacks can be resolved in order of change
  if (hash === '#') { // is root

    structOrigin.action = action;

  } else {

    const hashParts = hash.split('/');
    const leafPart = hashParts[hashParts.length - 1];

    hashParts.reduce((branch, part) => {

      if (branch[part]) {

        if (part === leafPart) {
          branch[part].action = action;
        }

        return branch[part].children;

      } else {

        return (branch[part] = {
          action: part === leafPart ? action : void 0,
          children: {}
        }).children;

      }

    }, structOrigin.children);

  }

}

function getRouteParts(route) {

  if (ALLOWED_ORIGIN_NAMES.indexOf(route) > -1) {
    return {
      rel: '/',
      abs: ORIGIN,
      hash: '#',
      query: ''
    }
  }

  if (route[0] === '?' || route[0] === '#') {
    const {hash, query} = getHashAndQuery(route);
    return {
      rel: convertHashToRelativePath(hash),
      abs: ORIGIN + hash,
      hash: hash || '#',
      query: query
    }
  }

  route = removeAllowedOriginPrefix(route);

  if (route [0] !== '?' && route[0] !== '#') {
    throw new Error('Invalid Route: "' + route + '". Non-root paths must start with ? query or # hash.');
  }

  const {hash, query} = getHashAndQuery(route);

  return {
    rel: convertHashToRelativePath(hash),
    abs: ORIGIN + hash,
    hash: hash || '#',
    query: query
  }

}

function getHashAndQuery(route) {

  const indexOfHash = route.indexOf('#');
  const indexOfQuestion = route.indexOf('?');

  if (indexOfHash === -1) { // url has no hash
    return {
      hash: '',
      query: removeTrailingSlash(new URL(route, ORIGIN).search)
    }
  }

  if (indexOfQuestion === -1) { // url has no query
    return {
      hash: removeTrailingSlash(new URL(route, ORIGIN).hash),
      query: ''
    }
  }

  const url = new URL(route, ORIGIN);

  if (indexOfQuestion < indexOfHash) { // standard compliant url with query before hash
    return {
      hash: removeTrailingSlash(url.hash),
      query: removeTrailingSlash(url.search)
    }
  }

  // non-standard url with hash before query (query is inside the hash)
  let hash = url.hash;
  const query = hash.slice(hash.indexOf('?'));
  hash = hash.replace(query, '');

  return {
    hash: removeTrailingSlash(hash),
    query: removeTrailingSlash(query)
  }

}

function convertHashToRelativePath(hash) {
  return (hash === '#' ? '/' : hash) || '/';
}

function removeTrailingSlash(str) {
  return str[str.length - 1] === '/' ? str.substring(0, str.length - 1) : str;
}

function removeAllowedOriginPrefix(route) {
  const lop = getLongestOccurringPrefix(route, ALLOWED_ORIGIN_NAMES);
  const hashPart = lop ? route.substr(lop.length) : route;
  return hashPart.lastIndexOf('/', 0) === 0 ? hashPart.substr(1) : hashPart;
}

function getLongestOccurringPrefix(s, prefixes) {
  return prefixes
    .filter(x => s.lastIndexOf(x, 0) === 0)
    .sort((a, b) => b.length - a.length)[0];
}

export {Component, Store, Server, Router};