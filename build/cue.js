(function(window) {
const NOOP = (() => {});

const RESOLVED_PROMISE = Promise.resolve();

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

  return a!==a && b!== b;

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
  if (!str.length) return 0;
  let hash = 0;
  for (let i = 0, char; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

const LocalStorage = window.localStorage;
const pendingCalls = new Map();
const ALL_KEYS = 'CUE_SERVER_CACHE::KEYS';
const EMPTY_CACHE_STORAGE_KEY = Symbol();

const Server = {

  fetch(url, expires = 0, token) {

    return new Promise((resolve, reject) => {

      const hash = hashString(url);
      const data = getCache(hash);

      if (data === EMPTY_CACHE_STORAGE_KEY) {
        makeCall(url, 'GET', token).then(response => {
          expires > 0 && setCache(hash, response, expires);
          resolve(response);
        }).catch(error => {
          reject(error);
        });
      } else {
        resolve(data);
      }

    });

  },

  get(url, expires = 0, token) {
    return this.fetch(url, expires, token);
  },

  post(url, data, token) {
    return new Promise((resolve, reject) => {
      makeCall(url, 'POST', token, data)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  },

  put(url, data, token) {
    return new Promise((resolve, reject) => {
      makeCall(url, 'PUT', token, data)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  },

  delete(url, data, token) {
    return new Promise((resolve, reject) => {
      makeCall(url, 'DELETE', token, data)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  },

  clearCache(url) {
    clearCache(hashString(url));
  }

};

// --------------------------------------------------------

function setCache(hash, value, expires) {

  const now = Date.now();
  const schedule = now + expires * 1000;

  if (typeof value === 'object') value = JSON.stringify(value);

  const url_stamped = `${hash}::ts`;
  LocalStorage.setItem(hash, value);
  LocalStorage.setItem(url_stamped, `${schedule}`);

  let allKeys = LocalStorage.getItem(ALL_KEYS);
  if (allKeys === null) {
    allKeys = `${hash},${url_stamped},`;
  } else if (allKeys.indexOf(`${hash},`) === -1) {
    allKeys = `${allKeys}${hash},${url_stamped},`;
  }

  LocalStorage.setItem(ALL_KEYS, allKeys);

}

function getCache(hash) {

  const timestamp = LocalStorage.getItem(`${hash}::ts`);

  if (timestamp === null) {
    return EMPTY_CACHE_STORAGE_KEY;
  } else {
    if (Number(timestamp) < Date.now()) {
      clearCache(hash);
      return EMPTY_CACHE_STORAGE_KEY;
    } else {
      return JSON.parse(LocalStorage.getItem(hash));
    }
  }

}

function clearCache(hash) {
  if (hash) {
    if (LocalStorage.getItem(hash) !== null) {
      const url_stamped = `${hash}::ts`;
      LocalStorage.removeItem(hash);
      LocalStorage.removeItem(url_stamped);
      const _allKeys = LocalStorage.getItem(ALL_KEYS);
      if (_allKeys !== null) {
        const allKeys = _allKeys.split(',');
        allKeys.splice(allKeys.indexOf(hash), 1);
        allKeys.splice(allKeys.indexOf(url_stamped), 1);
        LocalStorage.setItem(ALL_KEYS, `${allKeys.join(',')},`);
      }
    }
  } else {
    const _allKeys = LocalStorage.getItem(ALL_KEYS);
    if (_allKeys !== null) {
      const allKeys = _allKeys.split(',');
      for (let i = 0; i < allKeys.length; i++) {
        LocalStorage.removeItem(allKeys[i]);
      }
      LocalStorage.removeItem(ALL_KEYS);
    }
  }
}

function makeCall(url, method, token, data = {}) {

  if (pendingCalls.has(url)) {

    return pendingCalls.get(url);

  } else {

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    pendingCalls.set(url, new Promise((resolve, reject) => {

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
        pendingCalls.delete(url);
      });

    }));

    return pendingCalls.get(url);

  }

}

let PENDING_PROMISE = null;
let CURRENT_RESOLVE = null;
let FLUSHING_BUFFER = false;

const EVENTS = new Map();
const CALLBACKS = new Map();
const COMPUTED_PROPERTIES = new Map();
const DEPENDENCIES = new Map();
const RESOLVED = [];

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
    return PENDING_PROMISE || (PENDING_PROMISE = new Promise(reactionResolver));
  }

};

// ----------------------------------------

function reactionResolver(resolve) {
  if (FLUSHING_BUFFER === false) {
    CURRENT_RESOLVE = resolve;
    requestAnimationFrame(flushReactionBuffer);
  }
}

function flushReactionBuffer() {

  FLUSHING_BUFFER = true;

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

  FLUSHING_BUFFER = false;

  CURRENT_RESOLVE();

  CURRENT_RESOLVE = null;
  PENDING_PROMISE = null;

}

const STORE = new Map();
const EVENTS$1 = new Map();

const Store = {

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

    if (EVENTS$1.has(key)) {
      EVENTS$1.get(key).push(event);
    } else {
      EVENTS$1.set(key, [event]);
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
        const events = EVENTS$1.get(key);
        events.splice(events.indexOf(event), 1);
      }
    }

  }

};

function internalStoreSet(key, value, deepCompare) {

  if (deepCompare === true && deepEqual(STORE.get(key), value)) {
    return false;
  }

  STORE.set(key, value);
  dispatchEvent(key, value);

  return true;

}

function dispatchEvent(key, value) {

  const event = EVENTS$1.get(key);

  if (event) {

    for (let i = 0; i < event.length; i++) {
      Reactor.cueEvent(event[i].handler, value);
    }

    return Reactor.react();

  } else {

    return RESOLVED_PROMISE;

  }

}

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
    this.intermediate = undefined; // intermediate computation result
    this._value = undefined; // current computation result
    this._type = DATA_TYPE_UNDEFINED; // optimization flag

    // Optimization flags
    this.needsUpdate = true; // flag indicating that one or many dependencies have been updated (required by this.value)
    this.hasChanged = false; // flag indicating that the computation has yielded a new result (required for dependency traversal)

  }

  value(source) {

    if (this.needsUpdate === true) {

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

const REF_ID = '$';
const SELF_REGEXP = /\$self/g;
const CHILD_SELECTORS = [' ','.',':','#','[','>','+','~'];

let CLASS_COUNTER = -1;

const INTERNAL = Symbol('Component Data');

const CUE_DATA_EVENT_TYPE = '_cue:data';

const TMP_DIV = document.createElement('div');

const CUE_CSS = {
  compiler: Object.assign(document.head.appendChild(document.createElement('style')), {id: 'cue::compiler'}),
  components: Object.assign(document.head.appendChild(document.createElement('style')), {id: 'cue::components'})
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
      reactions: {},
      events: {}
    };

    const Template = document.createElement('template');
    Template.innerHTML = config.element || '';

    const RefNames = collectElementReferences(Template.content, {});

    // ---------------------- CUSTOM ELEMENT INSTANCE ----------------------
    const CueElement = class CueElement extends HTMLElement {

      constructor() {

        super();

        // ---------------------- INSTANCE INTERNALS ----------------------
        this[INTERNAL]= {
          reactions: {},
          computedProperties: new Map(),
          subscriptions: [],
          refs: {},
          _data: {},
          initialized: false,
          hasDataEventListener: false,
          dataEvents: {}, // what is dispatched
          dataEventHandlers: new Map(), // what is listened to
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

              if (v.value && v.value.id === Store.id) {
                Data.bindings[k] = v.value;
              } else if (typeof v.value === 'function') {
                Data.computed.set(k, new ComputedProperty(k, v.value));
              } else {
                Data.static[k] = v.value;
              }

              if (typeof v.reaction === 'function') {
                Data.reactions[k] = v.reaction;
              }

              if (v.event === true) {
                Data.events[k] = {
                  bubbles: true,
                  cancelable: true
                };
              } else if (typeof v.event === 'object' && v.event !== null) {
                Data.events[k] = v.event;
              }

            }

          }

          // ---------------------- COMPUTED PROPERTIES ----------------------
          if (Data.computed.size > 0) {
            Data.computed = setupComputedProperties(allProperties, Data.computed);
          }

        }

        const internal = this[INTERNAL];

        // ------------- INSTANCE INIT ------------
        // (only run after initial construction, never on re-connect)

        if (internal.initialized === false) {

          internal.initialized = true;

          // ------------- Create Data Model
          const data = internal._data = Object.assign(deepClone(Data.static), internal._data);
          const computedProperties = internal.computedProperties;

          internal.data = new Proxy(data, {
            set: forbiddenProxySet,
            get(target, key) {
              if (Data.bindings[key]) return Store.get(Data.bindings[key].path); // does deep clone
              if (computedProperties.has(key)) return computedProperties.get(key).value(internal.data); // deep by default
              return deepClone(target[key]); // deep clone
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

          // Build reusable customEvent objects for internal use
          for (const key in Data.events) {
            internal.dataEvents[key] = new CustomEvent(CUE_DATA_EVENT_TYPE, Object.assign(Data.events[key], {
              detail: {
                key: key,
                value: void 0
              }
            }));
          }

          // ----------- INSERT DOM AND ASSIGN REFS ----------
          if (this.innerHTML.length === 0) {
            this.innerHTML = Template.innerHTML;
          }

          // ---------------- ASSIGN REF ELEMENTS
          for (const refName in RefNames) {
            const el = this.querySelector(RefNames[refName]);
            if (el) {
              if (!el[INTERNAL]) {
                el[INTERNAL] = {};
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

          // ----------------- Bind / Cue Store
          for (const key in Data.bindings) {

            const storeBinding = Data.bindings[key];
            const path = storeBinding.path;

            if (Store.has(path)) {
              if (internal.reactions[key]) {
                Reactor.cueCallback(internal.reactions[key], Store.get(path));
              }
            } else {
              if (storeBinding.hasOwnProperty('defaultValue')) {
                Store.set(path, storeBinding.defaultValue);
              } else {
                throw new Error(`Component data of "${name}" has property "${key}" bound to Store["${path}"] but Store has no value and component specifies no default.`);
              }
            }

          }

          // ---------------- Run reactions
          for (const key in internal.reactions) {
            Reactor.cueCallback(internal.reactions[key], internal.data[key]);
          }

          // ---------------- Trigger First Render
          Reactor.react().then(() => {
            Lifecycle.initialize.call(this, internal.refs);
            Lifecycle.connected.call(this, internal.refs);
          });

        } else {

          Lifecycle.connected.call(this, internal.refs); // runs whenever instance is (re-) inserted into DOM

        }

        // Add Store Subscriptions on every connect callback - unbind in disconnectedCallback
        for (const key in Data.bindings) {

          // Computation Subscriptions
          internal.dependencyGraph.has(key) && internal.subscriptions.push(Store.subscribe(
            Data.bindings[key].path,
            () => Reactor.cueComputations(internal.dependencyGraph, internal.reactions, key, internal.data),
            { autorun: false }
          ));

          // Reaction Subscriptions
          internal.reactions[key] && internal.subscriptions.push(Store.subscribe(
            Data.bindings[key].path,
            internal.reactions[key],
            { autorun: false }
          ));

        }

      }

      disconnectedCallback() {

        const internal = this[INTERNAL];
        const subscriptions = internal.subscriptions;
        while (subscriptions.length) {
          subscriptions.pop().unsubscribe();
        }

        Lifecycle.disconnected.call(this, internal.refs);

      }

      getData(key) {

        if (!key) {
          // when no key is passed, retrieve object of all settable properties (all except computed)
          const internal = this[INTERNAL];
          const dataClone = {};
          let key;

          for (key in Data.bindings) {
            dataClone[key] = Store.get(Data.bindings[key].path); // returns deep clone
          }

          for (key in internal._data) {
            dataClone[key] = deepClone(internal._data[key]); // make deep clone
          }

          return dataClone;

        }

        return this[INTERNAL].data[key]; // proxy returns deep clone

      }

      setData(key, value) {

        if (typeof key === 'object' && key !== null) {

          const internal = this[INTERNAL];

          let anyPropChanged = false;

          for (const prop in key) {

            if (Data.computed.has(prop)) {
              throw new Error(`Can not set property "${prop}" because it is a computed property.`);
            }

            const newValue = key[prop];

            if (!deepEqual(internal._data[prop], newValue)) {

              anyPropChanged = true;

              if (Data.bindings[prop]) {
                internalStoreSet(Data.bindings[prop].path, newValue, false); // do internal store set without another deep comparison
              } else {
                internal._data[prop] = newValue;
                internal.reactions[prop] && Reactor.cueCallback(internal.reactions[prop], newValue);
                internal.dependencyGraph.has(prop) && Reactor.cueComputations(internal.dependencyGraph, internal.reactions, prop, internal.data);
              }

              if (internal.dataEvents[prop]) {
                internal.dataEvents[prop].detail.value = newValue;
                this.dispatchEvent(internal.dataEvents[prop]);
              }

            } else {

              anyPropChanged = anyPropChanged || false;

            }

          }

          return anyPropChanged ? Reactor.react() : RESOLVED_PROMISE;

        }

        if (Data.computed.has(key)) {
          throw new Error(`You can not set property "${key}" because it is a computed property.`);
        }

        if (Data.bindings[key]) {
          return internalStoreSet(Data.bindings[key].path, value, true) ? Reactor.react() : RESOLVED_PROMISE;
        }

        const internal = this[INTERNAL];

        if (deepEqual(internal._data[key], value)) {
          return RESOLVED_PROMISE;
        }

        internal._data[key] = value; // skip proxy

        if (internal.dataEvents[key]) {
          internal.dataEvents[key].detail.value = value;
          this.dispatchEvent(internal.dataEvents[key]);
        }

        if (internal.reactions[key]) {
          Reactor.cueCallback(internal.reactions[key], value);
        }

        if (internal.dependencyGraph.has(key)) {
          Reactor.cueComputations(internal.dependencyGraph, internal.reactions, key, internal.data);
        }

        return Reactor.react();

      }

      onData(key, handler) {

        const internal = this[INTERNAL];

        if (internal.hasDataEventListener === false) { // only register one listener
          internal.hasDataEventListener = true;
          this.addEventListener(CUE_DATA_EVENT_TYPE, e => {
            const thisPropListeners = internal.dataEventHandlers.get(e.detail.key);
            if (thisPropListeners) {
              for (let i = 0; i < thisPropListeners.length; i++) {
                thisPropListeners[i](e.detail.value);
              }
            }
          });
        }

        if (internal.dataEventHandlers.has(key)) {
          internal.dataEventHandlers.get(key).push(handler);
        } else {
          internal.dataEventHandlers.set(key, [ handler ]);
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

    node = node.trim();

    let element;

    if (node[0] === '<') {
      TMP_DIV.innerHTML = node;
      element = TMP_DIV.children[0];
    } else {
      element = document.createElement(node);
    }

    const internal = element[INTERNAL];

    if (internal && data && typeof data === 'object') {
      console.warn('[Cue.js] - Component.create(...) [data] parameter will be deprecated in a future version. Pass data object as an attribute to the components factory function instead.');
      Object.assign(internal._data, deepClone(data));
    }

    return element;

  }

};

// -----------------------------------

// html
function collectElementReferences(root, refNames) {

  for (let i = 0, child, ref, cls1, cls2; i < root.children.length; i++) {

    child = root.children[i];

    ref = child.getAttribute(REF_ID);

    if (ref) {
      cls1 = child.getAttribute('class');
      cls2 = ref + ++CLASS_COUNTER;
      refNames[REF_ID + ref] = '.' + cls2;
      child.setAttribute('class', cls1 ? cls1 + ' ' + cls2 : cls2);
      child.removeAttribute(REF_ID);
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
    styles = styles.replace(new RegExp('\\' + refName, 'g'), refNames[refName]);
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
  const previousData = this[INTERNAL].childData || [];
  this[INTERNAL].childData = dataArray;

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

if (ORIGIN[ORIGIN.length -1] !== '/') {
  ABSOLUTE_ORIGIN_NAMES.push(ORIGIN + '/');
}

if (window.location.pathname && window.location.pathname !== '/') {
  ABSOLUTE_ORIGIN_NAMES.push(window.location.pathname);
}

const ALLOWED_ORIGIN_NAMES = ['/', '#', '/#', '/#/', ...ABSOLUTE_ORIGIN_NAMES];

const ROUTES = new Set();
const WILDCARD_HANDLERS = new Set();
const ROUTE_HOOK_HANDLERS = new Map();
const ON_ROUTE_HANDLER_CACHE = new Map();
const ROUTES_STRUCT = {};

const DEFAULT_TRIGGER_OPTIONS = {
  params: {},
  keepQuery: true,
  revertible: true,
  forceReload: false
};

const DEFAULT_RESPONSE = {
  then: cb => cb(window.location.href)
};

let recursions = 0;
let onRoutesResolved = null;
let resolveCancelled = false;
let resolvedBaseNode = null;
let routesDidResolve = false;

let pendingParams = {};
let navigationInProgress = false;
let listenerRegistered = false;
let currentAbs = '';
let lastRequestedNavigation = null;

const Router = {

  options: {
    recursionWarningCount: 5,
    recursionThrowCount: 10,
    defer: 50 // only execute navigations n milliseconds after the last call to Router.navigate
  },

  hook(route, handler, scope = null, once = false) {

    const hash = getRouteParts(route).hash;

    if (!ROUTE_HOOK_HANDLERS.has(hash)) {
      ROUTE_HOOK_HANDLERS.set(hash, []);
    }

    const hooks = ROUTE_HOOK_HANDLERS.get(hash);

    let _handler;

    if (once === false) {
      _handler = handler.bind(scope);
    } else {
      _handler = params => {
        handler.call(scope, params);
        const i = hooks.indexOf(_handler);
        hooks.splice(i, 1);
      };
    }

    hooks.push(_handler);

  },

  trigger(route, options = {}) {

    options = Object.assign({}, DEFAULT_TRIGGER_OPTIONS, options);

    const {hash, query} = getRouteParts(route);

    const hooks = ROUTE_HOOK_HANDLERS.get(hash);

    if (hooks && hooks.length) {

      const currentQueryString = !query && options.keepQuery ? window.location.search : query;
      const params = Object.assign(buildParamsFromQueryString(currentQueryString), options.params);

      for (let i = 0; i < hooks.length; i++) {
        hooks[i](params);
      }

    }

  },

  subscribe(baseRoute, options) {

    if (!options) {
      throw new Error('Router.subscribe requires second parameter to be "options" object or "onRoute" handler function.');
    } else if (typeof options === 'function') {
      const onRoute = options;
      options = { onRoute };
    } else if (typeof options.beforeRoute !== 'function' && typeof options.onRoute !== 'function') {
      throw new Error('Router.subscribe requires "options" object with "beforeRoute", "onRoute" or both handler functions.');
    }

    if (baseRoute === '*') {
      WILDCARD_HANDLERS.add(options.onRoute);
      return;
    }

    const hash = getRouteParts(baseRoute).hash;
    const isRoot = hash === '#';

    // dont register a route twice (do quick lookup)
    if (ROUTES.has(hash)) {
      throw new Error('Router already has an active subscription for "' + isRoot ? 'root' : baseRoute + '".');
    } else {
      ROUTES.add(hash);
    }

    // create root struct if it doesnt exist
    const root = (ROUTES_STRUCT[ORIGIN] = ROUTES_STRUCT[ORIGIN] || {
      beforeRoute: void 0,
      onRoute: void 0,
      children: {}
    });

    // register the baseRoute structurally so that its callbacks can be resolved in order of change
    if (isRoot) {
      root.beforeRoute = options.beforeRoute;
      root.onRoute = options.onRoute;
    } else {
      const hashParts = hash.split('/');
      const leafPart = hashParts[hashParts.length -1];
      hashParts.reduce((branch, part) => {
        if (branch[part]) {
          if (part === leafPart) {
            branch[part].beforeRoute = options.beforeRoute;
            branch[part].onRoute = options.onRoute;
          }
          return branch[part].children;
        } else {
          return (branch[part] = {
            beforeRoute: part === leafPart ? options.beforeRoute : void 0,
            onRoute: part === leafPart ? options.onRoute : void 0,
            children: {}
          }).children;
        }
      }, root.children);
    }

    // Auto-run subscription
    if (options.autorun !== false) {
      Router.navigate(window.location.href, {
        revertible: false,
        forceReload: true
      }).then(url => {
        window.history.replaceState(null, document.title, url);
      });
    }

    // Add PopState Listeners once
    if (listenerRegistered === false) {
      listenerRegistered = true;
      window.addEventListener('popstate', () => {
        Router.navigate(window.location.href, {
          revertible: false,
          forceReload: false
        }).then(url => {
          window.history.replaceState(null, document.title, url);
        });
      });
    }

  },

  navigate(route, options = {}) {

    options = Object.assign({}, DEFAULT_TRIGGER_OPTIONS, options);

    if (Router.options.defer > 0) {
      return new Promise(resolve => {
        clearTimeout(lastRequestedNavigation);
        lastRequestedNavigation = setTimeout(() => {
          navigate(route, options).then(res => resolve(res));
          lastRequestedNavigation = null;
        }, Router.options.defer);
      });
    } else {
      return navigate(route, options);
    }

  }

};

// --------------------------------------------------------

function navigate(route, options) {

  const {abs, hash, query} = getRouteParts(route);

  const currentQueryString = !query && options.keepQuery ? window.location.search : query;
  pendingParams = Object.assign(buildParamsFromQueryString(currentQueryString), options.params);

  const hooks = ROUTE_HOOK_HANDLERS.get(hash);

  if (hooks) {
    for (let i = 0; i < hooks.length; i++) {
      hooks[i](pendingParams);
    }
  }

  if (abs === currentAbs && options.forceReload === false) {
    return DEFAULT_RESPONSE;
  }

  if (navigationInProgress) {
    console.warn('Router.navigate to "' + route + '" not executed because another navigation is still in progress.');
    return DEFAULT_RESPONSE;
  } else {
    navigationInProgress = true;
  }

  return new Promise(resolve => {

    buildRouteStruct(abs).then(resolvedStruct => {

      buildURLFromStruct(resolvedStruct).then(finalAbs => { // finalRoute is absolute

        const url = new URL(finalAbs);
        url.search = currentQueryString;
        const urlString = url.toString();

        if (finalAbs === currentAbs && options.forceReload === false) {

          navigationInProgress = false;
          resolve(urlString);

        } else {

          gatherRouteCallbacks(resolvedStruct).then(callbacks => {

            for (let i = 0, tuple, handler, path; i < callbacks.length; i++) {

              tuple = callbacks[i]; handler = tuple[0]; path = tuple[1];

              if (options.forceReload === true || !ON_ROUTE_HANDLER_CACHE.has(handler) || ON_ROUTE_HANDLER_CACHE.get(handler) !== path) {
                handler(path, pendingParams);
                ON_ROUTE_HANDLER_CACHE.set(handler, path);
              }

            }

            WILDCARD_HANDLERS.forEach(handler => handler(urlString, pendingParams));

            currentAbs = finalAbs;

            if (options.revertible === true) {
              window.history.pushState(null, document.title, urlString);
            }

            navigationInProgress = false;
            resolve(urlString);

          });

        }

      });

    });

  });

}

function buildRouteStruct(absoluteRoute) {

  return new Promise(resolve => {

    recursions = 0;
    resolveCancelled = false;
    resolvedBaseNode = null;
    onRoutesResolved = resolve;
    routesDidResolve = false;

    if (!ROUTES_STRUCT[ORIGIN]) {
      onRoutesResolved(null);
    }

    resolveRouteHandlers(absoluteRoute);

  });

}

function resolveRouteHandlers(route) {

  if (route === ORIGIN) {

    if (resolvedBaseNode !== null) {
      onRoutesResolved(resolvedBaseNode);
    } else {
      collectRouteNodes(ROUTES_STRUCT, [ORIGIN]).then(baseNode => {
        resolvedBaseNode = baseNode;
        if (routesDidResolve === false) {
          routesDidResolve = true;
          onRoutesResolved(resolvedBaseNode);
        }
      });
    }

  } else if (route.lastIndexOf(ORIGIN, 0) === 0) { // starts with origin (split at hash)

    const hashPart = route.substr(ORIGIN.length);

    if (hashPart[0] !== '#') {
      throw new Error('Invalid route "' + hashPart + '". Nested routes must be hash based.');
    }

    if (resolvedBaseNode !== null) {

      collectRouteNodes(ROUTES_STRUCT.children, hashPart.split('/')).then(hashNode => {
        if (routesDidResolve === false) {
          routesDidResolve = true;
          onRoutesResolved(Object.assign(resolvedBaseNode, {
            nextNode: hashNode
          }));
        }
      });

    } else {

      collectRouteNodes(ROUTES_STRUCT, [ORIGIN, ...hashPart.split('/')]).then(baseNode => {
        resolvedBaseNode = baseNode;
        if (routesDidResolve === false) {
          routesDidResolve = true;
          onRoutesResolved(resolvedBaseNode);
        }
      });

    }

  } else if (route[0] === '#') { // is hash

    collectRouteNodes(ROUTES_STRUCT[ORIGIN].children, route.split('/')).then(hashNode => {
      if (routesDidResolve === false) {
        routesDidResolve = true;
        onRoutesResolved(Object.assign(resolvedBaseNode, {
          nextNode: hashNode
        }));
      }
    });

  }

}

function collectRouteNodes(root, parts, rest = '') {

  return new Promise(resolve => {

    const currentNodeValue = parts[0];
    const frag = root[currentNodeValue];

    if (!frag || resolveCancelled) {

      resolve({
        value: parts.length && rest.length ? rest + '/' + parts.join('/') : parts.length ? parts.join('/') : rest.length ? rest : '/',
        nextNode: null
      });

    } else {

      rest += rest.length === 0 ? currentNodeValue : '/' + currentNodeValue;

      const nextParts = parts.slice(1);

      if (frag.beforeRoute) {

        const iNextNodeValue = getNextNodeValue(frag.children, nextParts);

        Promise.resolve(frag.beforeRoute(iNextNodeValue, pendingParams)).then(oNextNodeValue => {

          // TODO: oNextNodeValue should be object with {path: string, params: object of query parameters}
          oNextNodeValue = typeof oNextNodeValue === 'string'
            ? normalizeAbsoluteOriginPrefix(removeSlashes(oNextNodeValue))
            : iNextNodeValue;

          if (iNextNodeValue === oNextNodeValue) { // route same, continue

            resolve({
              value: rest,
              onRoute: frag.onRoute,
              nextNode: collectRouteNodes(frag.children, nextParts)
            });

          } else { // route modified

            if (currentNodeValue === ORIGIN) { // current node is origin

              if (iNextNodeValue !== '/' && iNextNodeValue[0] !== '#') {
                throw new Error('Invalid Route Setup: "' + iNextNodeValue + '" can not directly follow root url. Routes at this level must start with a #.');
              }

              if(oNextNodeValue[0] !== '#') {
                throw new Error('Invalid Route "' + oNextNodeValue + '" returned from beforeRoute. Routes at this level must start with a #.');
              }

              // Append to self or replace current hash root at origin with new hash root oNextNodeValue
              resolve({
                value: rest,
                onRoute: frag.onRoute,
                nextNode: collectRouteNodes(frag.children, oNextNodeValue.split('/'))
              });

            } else if (currentNodeValue[0] === '#') { // current node is hash root

              if (iNextNodeValue === '/') { // next node is self (hash root)

                // if oNextNodeValue[0] == '#': replace currentNodeValue with new hash oNextNodeValue...
                // else: append oNextValue to current hash root currentNodeValue
                resolve({
                  value: rest,
                  onRoute: frag.onRoute,
                  nextNode: collectRouteNodes(frag.children, oNextNodeValue.split('/'))
                });

              } else { // next node is hash firstChild

                if (oNextNodeValue === '/' || oNextNodeValue[0] === '#') {

                  // if (oNextNodeValue === '/'): go from firstChild back to hash root
                  // if (oNextNodeValue[0] === '#): replace hash root with new hash root
                  if (tryRecursion(parts)) {
                    resolve(collectRouteNodes(root, oNextNodeValue.split('/')));
                  }

                } else {

                  // replace firstChild iNextNodeValue with new firstChild oNextNodeValue
                  resolve({ // type 1
                    value: rest,
                    onRoute: frag.onRoute,
                    nextNode: collectRouteNodes(frag.children, oNextNodeValue.split('/'))
                  });

                }

              }

            } else { // current node is nth child

              // rewritten to origin, hash or something that starts with origin
              if (oNextNodeValue === ORIGIN || oNextNodeValue[0] === '#' || oNextNodeValue.lastIndexOf(ORIGIN, 0) === 0) {

                if (tryRecursion(parts)) {
                  resolveRouteHandlers(oNextNodeValue);
                }

              } else { // relative re-write

                resolve({
                  value: rest,
                  onRoute: frag.onRoute,
                  nextNode: collectRouteNodes(frag.children, oNextNodeValue.split('/'))
                });

              }

            }

          }

        });

      } else if (frag.onRoute) { // no beforeRoute rewrites but onRoute handler (chunk url)

        resolve({
          value: rest,
          onRoute: frag.onRoute,
          nextNode: collectRouteNodes(frag.children, nextParts)
        });

      } else { // no beforeRoute and no onRoute (continue with rest)

        resolve(collectRouteNodes(frag.children, nextParts, rest));

      }

    }

  });

}

function getNextNodeValue(root, parts, rest = '') {

  const part = parts[0];
  const frag = root[part];

  if (!frag) {
    return parts.length && rest.length ? rest + '/' + parts.join('/') : parts.length ? parts.join('/') : rest.length ? rest : '/';
  }

  rest += rest.length === 0 ? part : '/' + part;

  if (frag.beforeRoute || frag.onRoute) {
    return rest;
  }

  return getNextNodeValue(frag.children, parts.slice(1), rest);

}

function gatherRouteCallbacks(routeNode, callbacks = []) {

  return new Promise(resolve => {

    if (routeNode.nextNode === null) {
      resolve(callbacks);
    }

    Promise.resolve(routeNode.nextNode).then(nextNode => {
      if (nextNode !== null) {
        if (routeNode.onRoute) {
          callbacks.push([routeNode.onRoute, nextNode.value]);
        }
        resolve(gatherRouteCallbacks(nextNode, callbacks));
      }
    });

  });

}

function buildURLFromStruct(routeNode, url = '') {

  return new Promise(resolve => {
    if (routeNode === null || routeNode.value === '/') {
      resolve(url);
    } else {
      Promise.resolve(routeNode.nextNode).then(nextNode => {
        url += url.length === 0 || routeNode.value === ORIGIN || routeNode.value[0] === '#' ? routeNode.value : '/' + routeNode.value;
        resolve(buildURLFromStruct(nextNode, url));
      });
    }

  });

}

function tryRecursion(parts) {

  recursions++;

  if (recursions === Router.options.recursionThrowCount) {

    resolveCancelled = true;
    throw new Error('Router.navigate is causing potentially infinite route rewrites at "' + parts.join('/') + '". Stopped execution after ' + Router.options.recursionThrowCount + ' cycles...');

  } else {

    if (recursions === Router.options.recursionWarningCount) {
      console.warn('Router.navigate is causing more than ' + Router.options.recursionWarningCount + ' route rewrites...');
    }

    return true;

  }

}

function getRouteParts(route) {

  if (ALLOWED_ORIGIN_NAMES.indexOf(route) > -1) {
    return {
      abs: ORIGIN,
      hash: '#',
      query: ''
    }
  }

  if (route[0] === '?' || route[0] === '#') {
    const url = new URL(route, ORIGIN);
    return {
      abs: ORIGIN + url.hash,
      hash: url.hash || '#',
      query: url.search
    }
  }

  route = removeAllowedOriginPrefix(route);

  if (route [0] !== '?' && route[0] !== '#') {
    throw new Error('Invalid Route: "' + route + '". Non-root paths must start with ? query or # hash.');
  }

  const url = new URL(route, ORIGIN);

  return {
    abs: ORIGIN + url.hash,
    hash: url.hash || '#',
    query: url.search
  }

}

function removeSlashes(route) {

  // remove leading slash on all routes except single '/'
  if (route.length > 1 && route[0] === '/') {
    route = route.substr(1);
  }

  // remove trailing slash on all routes except single '/'
  if (route.length > 1 && route[route.length - 1] === '/') {
    route = route.slice(0, -1);
  }

  return route;

}

function removeAllowedOriginPrefix(route) {
  const lop = getLongestOccurringPrefix(route, ALLOWED_ORIGIN_NAMES);
  return lop ? route.substr(lop.length) : route;
}

function normalizeAbsoluteOriginPrefix(route) {
  const lop = getLongestOccurringPrefix(route, ABSOLUTE_ORIGIN_NAMES);
  return lop ? route.replace(lop, ORIGIN) : route;
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
