(function(window) {
const NOOP = (() => {});

function deepEqual(a, b) {

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

}

function deepClone(x) {

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

}

function areArraysShallowEqual(a, b) {

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;

}

function arePlainObjectsShallowEqual(a, b) {

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

}

function hashString(str) {
  if (!str.length) return '0';
  let hash = 0;
  for (let i = 0, char; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash + '';
}

function getArrayIntersection(a, b) {

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

}

function getArrayTail(a, b) {

  const tail = [];

  for (let i = a.length; i < b.length; i++) {
    tail.push(b[i]);
  }

  return tail;

}

const CACHE_STORAGE = window.localStorage;
const PENDING_CALLS = new Map();
const REQUEST_START_EVENTS = [];
const REQUEST_STOP_EVENTS = [];
const ALL_KEYS = 'CUE_SERVER_CACHE::KEYS';
const EMPTY_CACHE_STORAGE_KEY = Symbol();

let PENDING_REQUEST_EVENT = null;

const fireRequestStartEvents = () => {
  clearTimeout(PENDING_REQUEST_EVENT);
  for (let i = 0; i < REQUEST_START_EVENTS.length; i++) {
    REQUEST_START_EVENTS[i]();
  }
};

const fireRequestStopEvents = () => {
  PENDING_REQUEST_EVENT = setTimeout(() => {
    for (let i = 0; i < REQUEST_STOP_EVENTS.length; i++) {
      REQUEST_STOP_EVENTS[i]();
    }
  }, 100);
};

const Server = {

  get(url, expires = 0, token) {

    return new Promise((resolve, reject) => {

      fireRequestStartEvents();

      const hash = hashString(url);
      const data = getCache(hash);

      if (data === EMPTY_CACHE_STORAGE_KEY) {
        makeCall(url, 'GET', token).then(response => {
          expires > 0 && setCache(hash, response, expires);
          resolve(response);
        }).catch(error => {
          reject(error);
        }).finally(fireRequestStopEvents);
      } else {
        fireRequestStopEvents();
        resolve(data);
      }

    });

  },

  post(url, data, token) {
    return new Promise((resolve, reject) => {
      fireRequestStartEvents();
      makeCall(url, 'POST', token, data)
        .then(response => resolve(response))
        .catch(error => reject(error))
        .finally(fireRequestStopEvents);
    });
  },

  put(url, data, token) {
    return new Promise((resolve, reject) => {
      fireRequestStartEvents();
      makeCall(url, 'PUT', token, data)
        .then(response => resolve(response))
        .catch(error => reject(error))
        .finally(fireRequestStopEvents);
    });
  },

  delete(url, data, token) {
    return new Promise((resolve, reject) => {
      fireRequestStartEvents();
      makeCall(url, 'DELETE', token, data)
        .then(response => resolve(response))
        .catch(error => reject(error))
        .finally(fireRequestStopEvents);
    });
  },

  clearCache(url) {
    clearCache(hashString(url));
  },

  onRequestStart(handler) {

    if (REQUEST_START_EVENTS.indexOf(handler) > -1) {
      throw new Error('[Cue.js] Server.onRequestStart(handler) - the provided handler is already registered.');
    }

    REQUEST_START_EVENTS.push(handler);

    return {
      unsubscribe() {
        REQUEST_START_EVENTS.splice(REQUEST_START_EVENTS.indexOf(handler), 1);
      }
    }

  },

  onRequestStop(handler) {

    if (REQUEST_STOP_EVENTS.indexOf(handler) > -1) {
      throw new Error('[Cue.js] Server.onRequestStop(handler) - the provided handler is already registered.');
    }

    REQUEST_STOP_EVENTS.push(handler);

    return {
      unsubscribe() {
        REQUEST_STOP_EVENTS.splice(REQUEST_STOP_EVENTS.indexOf(handler), 1);
      }
    }

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
      return JSON.parse(CACHE_STORAGE.getItem(hash));
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
          res.json().then(error => reject(error));
        } else {
          if (res.status === 204) {
            resolve({});
          } else {
            res.json().then(data => resolve(data));
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

          //TODO:
          // internal.dataEvent.key = computedProperty.ownPropertyName
          // internal.dataEvent.value = deepClone(result);
          // parentComponent.dispatchEvent(internal.dataEvent);

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

const getStorageKey = (name, key) => hashString('cs-' + name + key);

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

// Regex matches when $self is:
// - immediately followed by css child selector (space . : # [ > + ~) OR
// - immediately followed by opening bracket { OR
// - immediately followed by chaining comma ,
// - not followed by anything (end of line)
const SELF_REGEXP = /(\$self(?=[\\040,{.:#[>+~]))|\$self\b/g;
const CHILD_SELECTORS = [' ','.',':','#','[','>','+','~'];

let CLASS_COUNTER = -1;

const INTERNAL$1 = Symbol('Component Data');

const TMP_DIV = document.createElement('div');

const CUE_CSS = {
  compiler: document.getElementById('cue::compiler') || Object.assign(document.head.appendChild(document.createElement('style')), {id: 'cue::compiler'}),
  components: document.getElementById('cue::components') || Object.assign(document.head.appendChild(document.createElement('style')), {id: 'cue::components'})
};

const Component = {

  define(name, config) {

    // ---------------------- SETUP MODULE ----------------------
    let isConstructed = false;
    let isConnected = false;

    const Lifecycle = {
      initialize: NOOP,
      connected: NOOP,
      disconnected: NOOP
    };

    const Data = {
      static: {},
      computed: new Map(),
      bindings: {},
      reactions: {}
    };

    const Template = document.createElement('template');
    Template.innerHTML = config.element || '';

    const RefNames = collectElementReferences(Template.content, {});

    // ---------------------- CUSTOM ELEMENT INSTANCE ----------------------
    const CueElement = class CueElement extends HTMLElement {

      constructor() {

        super();

        // ---------------------- INSTANCE INTERNALS ----------------------
        this[INTERNAL$1]= {
          reactions: {},
          computedProperties: new Map(),
          subscriptions: [],
          refs: {},
          _data: {},
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

        // ---------------------- RUN ONCE ON FIRST CONSTRUCT ----------------------
        if (isConstructed === false) {

          isConstructed = true;

          // ---------------------- CREATE SCOPED STYLES ----------------------
          if (typeof config.styles === 'string' && config.styles.length) {
            createComponentCSS(name, config.styles, RefNames);
          }

          // ---------------------- LIFECYCLE ----------------------
          if (typeof config.initialize === 'function') Lifecycle.initialize = config.initialize;
          if (typeof config.connectedCallback === 'function') Lifecycle.connected = config.connectedCallback;
          if (typeof config.disconnectedCallback === 'function') Lifecycle.disconnected = config.disconnectedCallback;

        }

      }

      connectedCallback() {

        // ----------- Connect Module (once) ----------
        if (isConnected === false) {

          isConnected = true;

          const allProperties = {};

          if (config.data) {

            config.data = typeof config.data === 'function' ? config.data() : config.data;

            for (const k in config.data) {

              const v = config.data[k];

              allProperties[k] = v.value;

              if (v.value && v.value.id === STORE_BINDING_ID) {
                Data.bindings[k] = v.value;
              } else if (typeof v.value === 'function') {
                Data.computed.set(k, new ComputedProperty(k, v.value));
              } else {
                Data.static[k] = v.value;
              }

              if (typeof v.reaction === 'function') {
                Data.reactions[k] = v.reaction;
              }

            }

          }

          // ---------------------- COMPUTED PROPERTIES ----------------------
          if (Data.computed.size > 0) {
            Data.computed = setupComputedProperties(allProperties, Data.computed);
          }

        }

        const internal = this[INTERNAL$1];

        // ------------- INSTANCE INIT ------------
        // (only run after initial construction, never on re-connect)

        if (internal.initialized === false) {

          internal.initialized = true;

          // ------------- Create Data Model
          const data = internal._data = Object.assign(deepClone(Data.static), internal._data);
          const computedProperties = internal.computedProperties;

          internal.data = new Proxy(data, {
            set: forbiddenProxySet,
            get(target, key) { // returns deep clone of bound store data, computed data or local data
              if (Data.bindings[key]) return Data.bindings[key].get(true); // true -> get deep clone
              if (computedProperties.has(key)) return computedProperties.get(key).value(internal.data);
              return deepClone(target[key]);
            }
          });

          // Clone Computed Properties
          for (const tuple of Data.computed.entries()) {
            const val = tuple[1];
            computedProperties.set(tuple[0], new ComputedProperty(val.ownPropertyName, val.computation, val.sourceProperties));
          }

          // Build Dependency Graph
          internal.dependencyGraph = buildDependencyGraph(internal.computedProperties);

          // Bind reactions with first argument as "refs" object, second argument the current value and third argument the entire "data" object
          for (const key in Data.reactions) {
            internal.reactions[key] = value => {
              Data.reactions[key](internal.refs, value, internal.data);
            };
          }

          // ----------- INSERT DOM AND ASSIGN REFS ----------
          if (this.innerHTML.length === 0) {
            this.innerHTML = Template.innerHTML;
          }

          // ---------------- ASSIGN REF ELEMENTS
          for (const refName in RefNames) {
            const el = this.querySelector(RefNames[refName]);
            if (el) {
              if (!el[INTERNAL$1]) {
                el[INTERNAL$1] = {};
                el.renderEach = renderEach; // give every ref element fast list rendering method
              }
              internal.refs[refName] = el; // makes ref available as $refName in js
            }
          }

          internal.refs['$self'] = this; // this === $self for completeness

          // ----------------- Parse attribute data into internal data model
          if (this.hasAttribute('data')) {
            const attributeData = JSON.parse(this.getAttribute('data'));
            this.removeAttribute('data');
            Object.assign(internal._data, attributeData);
          }

          // ---------------- Run reactions
          for (const key in internal.reactions) {
            Reactor.cueCallback(internal.reactions[key], internal.data[key]);
          }

          // ---------------- Trigger First Render
          Reactor.react();

          // ---------------- Initialize after First Render
          requestAnimationFrame(() => {
            Lifecycle.initialize.call(this, internal.refs);
            Lifecycle.connected.call(this, internal.refs);
          });

        } else {

          Lifecycle.connected.call(this, internal.refs); // runs whenever instance is (re-) inserted into DOM

        }

        // Add Store Subscriptions on every connect callback - unbind in disconnectedCallback
        for (const key in Data.bindings) {

          // Computation Subscriptions
          internal.dependencyGraph.has(key) && internal.subscriptions.push(Data.bindings[key].store.subscribe(
            Data.bindings[key].key,
            () => Reactor.cueComputations(internal.dependencyGraph, internal.reactions, key, internal.data)
          ));

          // Reaction Subscriptions
          internal.reactions[key] && internal.subscriptions.push(Data.bindings[key].store.subscribe(
            Data.bindings[key].key,
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

        Lifecycle.disconnected.call(this, internal.refs);

      }

      getData(key) {

        if (!key) {
          // when no key is passed, retrieve object of all settable properties (all except computed)
          const internal = this[INTERNAL$1];
          const dataClone = {};
          let key;

          for (key in Data.bindings) {
            dataClone[key] = Data.bindings[key].get(true); // true -> get deep clone
          }

          for (key in internal._data) {
            dataClone[key] = deepClone(internal._data[key]); // make deep clone
          }

          return dataClone;

        }

        return this[INTERNAL$1].data[key]; // proxy returns deep clone

      }

      setData(key, value) {

        if (typeof key === 'object') {
          for (const prop in key) {
            this.setData(prop, key[prop]);
          }
        }

        if (Data.computed.has(key)) {
          throw new Error(`You can not set property "${key}" because it is a computed property.`);
        }

        const internal = this[INTERNAL$1];

        if (Data.bindings[key] && !deepEqual(Data.bindings[key].get(false), value)) {

          internal.dataEvent.detail.key = key;
          internal.dataEvent.detail.value = deepClone(value);
          this.dispatchEvent(internal.dataEvent);

          Data.bindings[key].set(value);

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

    };

    // ---------------------- ADD METHODS TO PROTOTYPE ----------------------
    for (const k in config) {
      if (typeof config[k] === 'function' && k !== 'initialize') {
        CueElement.prototype[k] = config[k];
      }
    }

    // ---------------------- ADD SPECIAL METHODS TO PROTOTYPE ----------------------
    CueElement.prototype.renderEach = renderEach;

    // ---------------------- DEFINE CUSTOM ELEMENT ----------------------
    customElements.define(name, CueElement);

    // ----------------------- RETURN HTML STRING FACTORY FOR EMBEDDING THE ELEMENT WITH ATTRIBUTES -----------------------
    const openTag = '<'+name, closeTag = '</'+name+'>';
    return attributes => {
      let htmlString = openTag, att, val;
      for (att in attributes) {
        val = attributes[att];
        val = val && typeof val === 'object' ? JSON.stringify(val) : val;
        htmlString += ` ${att}='${val}'`;
      }
      htmlString += '>' + Template.innerHTML + closeTag;
      return htmlString
    };

  },

  create(node, data) {

    node = typeof node === 'function' ? node() : node;
    node = node.trim();

    if (typeof node !== 'string' || node[0] !== '<') {
      throw new Error('[Cue.js] - Component.create(node) -> argument "node" is not valid HTML: "' + node + '"');
    }

    TMP_DIV.innerHTML = node;
    const element = TMP_DIV.children[0];

    if (data) {
      console.warn('[Cue.js] - Component.create(...) [data] parameter will be deprecated in a future version. Pass data object as an attribute to the components factory function instead.');
      const internal = element[INTERNAL$1];
      if (internal) {
        Object.assign(internal._data, deepClone(data));
      } else {
        console.warn('[Cue.js] - Component.create(...) [data] parameter passed to non-cue element will be ignored.');
      }
    }

    return element;

  }

};

// -----------------------------------

// html
function collectElementReferences(root, refNames) {

  for (let i = 0, child, ref, cls1, cls2; i < root.children.length; i++) {

    child = root.children[i];

    ref = child.getAttribute('$');

    if (ref) {
      cls1 = child.getAttribute('class');
      cls2 = ref + ++CLASS_COUNTER;
      refNames['$' + ref] = '.' + cls2;
      child.setAttribute('class', cls1 ? cls1 + ' ' + cls2 : cls2);
      child.removeAttribute('$');
    }

    collectElementReferences(child, refNames);

  }

  return refNames;

}

// css
function createComponentCSS(name, styles, refNames) {

  // Re-write $self to component-name
  styles = styles.replace(SELF_REGEXP, name);

  // Re-write $refName(s) in style text to class selector
  for (const refName in refNames) {
    // replace $refName with internal .class when $refName is:
    // - immediately followed by css child selector (space . : # [ > + ~) OR
    // - immediately followed by opening bracket { OR
    // - immediately followed by chaining comma ,
    // - not followed by anything (end of line)
    styles = styles.replace(new RegExp("(\\" + refName + "(?=[\\40{,.:#[>+~]))|\\" + refName + "\b", 'g'), refNames[refName]);
  }

  CUE_CSS.compiler.innerHTML = styles;
  const tmpSheet = CUE_CSS.compiler.sheet;

  let styleNodeInnerHTML = '', styleQueries = '';
  for (let i = 0, rule; i < tmpSheet.rules.length; i++) {

    rule = tmpSheet.rules[i];

    if (rule.type === 7 || rule.type === 8) { // do not scope @keyframes
      styleNodeInnerHTML += rule.cssText;
    } else if (rule.type === 1) { // style rule
      styleNodeInnerHTML += constructScopedStyleRule(rule, name);
    } else if (rule.type === 4 || rule.type === 12) { // @media/@supports query
      styleQueries += constructScopedStyleQuery(name, rule);
    } else {
      console.warn(`CSS Rule of type "${rule.type}" is not currently supported by Cue Components.`);
    }

  }

  // write queries to the end of the rules AFTER the other rules (issue #13)
  styleNodeInnerHTML += styleQueries;

  // Empty Compiler styleSheet
  CUE_CSS.compiler.innerHTML = '';
  CUE_CSS.components.innerHTML += styleNodeInnerHTML;

}

function constructScopedStyleQuery(name, query, cssText = '') {

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
      cssText += constructScopedStyleRule(rule, name);
    } else if (rule.type === 4 || rule.type === 12) { // nested query
      styleQueries += constructScopedStyleQuery(name, rule);
    } else {
      console.warn(`CSS Rule of type "${rule.type}" is not currently supported by Components.`);
    }

  }

  // write nested queries to the end of the surrounding query (see issue #13)
  cssText += styleQueries + ' }';

  return cssText;

}

function constructScopedStyleRule(rule, componentName) {

  let cssText = '';

  if (rule.selectorText.indexOf(',') > -1) {

    const selectors = rule.selectorText.split(',');
    const scopedSelectors = [];

    for (let i = 0, selector; i < selectors.length; i++) {

      selector = selectors[i].trim();

      if (selector.lastIndexOf(':root', 0) === 0) { // escape context (dont scope) :root notation
        scopedSelectors.push(selector.replace(':root', ''));
      } else if (isTopLevelSelector(selector, componentName)) { // dont scope component-name
        scopedSelectors.push(selector);
      } else { // prefix with component-name to create soft scoping
        scopedSelectors.push(componentName + ' ' + selector);
      }

    }

    cssText += scopedSelectors.join(', ') + rule.cssText.substr(rule.selectorText.length);

  } else {

    if (rule.selectorText.lastIndexOf(':root', 0) === 0) { // escape context (dont scope) :root notation
      cssText += rule.cssText.replace(':root', ''); // remove first occurrence of :root
    } else if (isTopLevelSelector(rule.selectorText, componentName)) { // dont scope component-name
      cssText += rule.cssText;
    } else { // prefix with component-name to create soft scoping
      cssText += componentName + ' ' + rule.cssText;
    }

  }

  return cssText;

}

function isTopLevelSelector(selectorText, componentName) {
  if (selectorText === componentName) { // is componentName
    return true;
  } else if (selectorText.lastIndexOf(componentName, 0) === 0) { // starts with componentName
    return CHILD_SELECTORS.indexOf(selectorText.charAt(componentName.length)) > -1; // character following componentName is valid child selector
  } else { // nada
    return false;
  }
}

// utils
function forbiddenProxySet(target, key, value) {
  throw new Error(`Can not change data in reactions: this.${key} = ${value} has been ignored.`);
}

function renderEach(dataArray, createElement, updateElement = NOOP) {

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
  const snake = longestIncreasingSubsequence(positions, newStart);

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

function longestIncreasingSubsequence(ns, newStart) {

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

}

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

const ROUTES_STRUCT = {};

const DEFAULT_TRIGGER_OPTIONS = {
  params: {},
  keepQuery: true,
  forceReload: false,
  history: 'pushState'
};

let HAS_POPSTATE_LISTENER = false;
let CURRENT_QUERY_PARAMETERS = {};
let CURRENT_ROUTE_FRAGMENTS = ['/'];
if (window.location.hash) {
  CURRENT_ROUTE_FRAGMENTS.push(...window.location.hash.split('/'));
}

const Router = {

  before(route, filter) {

    addPopStateListenerOnce();

    const { hash } = getRouteParts(route);

    if (REGISTERED_FILTERS.has(hash)) {
      throw new Error(`[Cue.js] Router.beforeRoute() already has a filter for ${hash === '#' ? `${route} (root url)` : route}`);
    }

    REGISTERED_FILTERS.set(hash, filter);

    // Auto apply filter
    const currentURLParts = getRouteParts(window.location.href);

    if (currentURLParts.hash === hash) {

      Object.assign(CURRENT_QUERY_PARAMETERS, buildParamsFromQueryString(currentURLParts.query));

      filter(currentURLParts.rel, CURRENT_QUERY_PARAMETERS, response => {
        if (response !== currentURLParts.rel) {
          if (response.lastIndexOf('http', 0) === 0) {
            window.location.href = response;
          } else {
            Router.navigate(response, {
              history: 'replaceState',
              forceReload: false
            });
          }
        }
      });

    }

  },

  on(route, action) {

    addPopStateListenerOnce();

    if (route === '*') {

      if (WILDCARD_ACTIONS.indexOf(action) === -1) {
        WILDCARD_ACTIONS.push(action);
      }

      // auto-run wildcard action
      action(CLEAN_ORIGIN + window.location.hash, Object.assign(CURRENT_QUERY_PARAMETERS, buildParamsFromQueryString(window.location.search)));

    } else {

      const { hash } = getRouteParts(route);

      if (REGISTERED_ACTIONS.has(hash)) {
        throw new Error('[Cue.js] Router.onRoute() already has a action for "' + hash === '#' ? (route + ' (root url)') : route + '".');
      }

      REGISTERED_ACTIONS.add(hash);

      assignActionToRouteStruct(hash, action);

      // auto-run action
      const currentURLParts = getRouteParts(window.location.href);

      // the current url starts with or is the registered hash -> do auto-run
      if (currentURLParts.hash.lastIndexOf(hash, 0) === 0) {

        let path = currentURLParts.hash.slice(hash.length);
        path = path[0] === '/' ? path.slice(1) : path;
        path = path === '' ? '/' : removeTrailingSlash(path);

        action(path, Object.assign(CURRENT_QUERY_PARAMETERS, buildParamsFromQueryString(currentURLParts.query)));

      }

    }

  },

  hasFilter(route) {
    const { hash } = getRouteParts(route);
    return REGISTERED_FILTERS.has(hash);
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

    const { hash, query, rel } = getRouteParts(route);

    options = Object.assign({}, DEFAULT_TRIGGER_OPTIONS, options);

    if (options.keepQuery === true) {
      Object.assign(CURRENT_QUERY_PARAMETERS, buildParamsFromQueryString(query));
    } else {
      CURRENT_QUERY_PARAMETERS = buildParamsFromQueryString(query);
    }

    // Apply route filter
    if (REGISTERED_FILTERS.has(hash)) {

      REGISTERED_FILTERS.get(hash)(rel, CURRENT_QUERY_PARAMETERS, response => {

        if (response !== rel) { // if filter returns different path re-route

          if (response.lastIndexOf('http', 0) === 0) {
            window.location.href = response;
          } else {
            Router.navigate(response, {
              history: 'replaceState',
              forceReload: false
            });
          }

        } else {

          performNavigation(hash, query, options.keepQuery, options.history);

        }

      });

    } else {

      performNavigation(hash, query, options.keepQuery, options.history);

    }

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

function buildParamsFromQueryString(queryString) {

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

}

function buildQueryStringFromParams(params) {

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

}

//removeIf(esModule)
const Cue = {Component, Store, Server, Router};
if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = Cue;
} else if (typeof define === 'function' && define.amd) {
  define('Cue', [], function() {
    return Cue;
  });
} else {
  window.Cue = Cue;
}
//endRemoveIf(esModule)
}(window || this));
