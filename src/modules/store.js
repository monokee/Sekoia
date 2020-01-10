import {deepEqual} from "./utils.js";

const STORE = new Map();
const EVENTS = new Map();

export const Store = {

  get(path) {

    if (!path) {

      const entireStore = {};

      for (const tuple of STORE.entries()) {
        entireStore[tuple[0]] = tuple[1];
      }

      return entireStore;

    }

    const keys = path.split('/');
    const root = STORE.get(keys[0]);

    if (root === void 0) {
      return void 0;
    }

    if (keys.length > 1) { // slash into object tree
      const [targetNode, targetKey] = getNode(root, keys);
      return targetNode[targetKey];
    }

    return root;

  },

  set(path, value) {

    if (arguments.length === 1) {

      if (typeof path !== 'object' || path === null) {
        throw new Error('Invalid arguments provided to Store.set...');
      }

      let didChange = false;

      for (const key in path) {
        const changed = this.set(key, path[key]);
        if (changed === true) didChange = true;
      }

      return didChange;

    }

    const keys = path.split('/');
    const root = STORE.get(keys[0]);

    if (keys.length > 1) { // sub-property

      const [targetNode, targetKey] = getNode(root, keys);

      if (deepEqual(targetNode[targetKey], value)) {
        return false;
      }

      targetNode[targetKey] = value;
      bubbleEvent(path, value, keys, root);
      return true;

    }

    if (root === void 0 || !deepEqual(root, value)) { // first write or full replace
      STORE.set(path, value);
      dispatchEvent(path, value);
      return true;
    }

    return false;

  },

  has(path) {

    const keys = path.split('/');
    const root = STORE.get(keys[0]);

    if (STORE.has(keys[0])) {

      if (keys.length > 1) {
        try {
          getNode(root, keys);
          return true;
        } catch(e) {
          return false;
        }
      }

      return true;

    }

    return false;

  },

  remove(path) {

    const keys = path.split('/');
    const root = STORE.get(keys[0]);

    if (root === void 0) {
      console.warn(`Can't remove Store entry "${path}" because it doesn't exist.`);
      return;
    }

    if (keys.length > 1) {

      const [targetNode, targetKey] = getNode(root, keys);

      if (Array.isArray(targetNode)) {
        targetNode.splice(parseInt(targetKey), 1);
      } else {
        delete targetNode[targetKey];
      }

      bubbleEvent(path, void 0, keys, root);
      return;

    }

    STORE.delete(keys[0]);
    dispatchEvent(path, void 0);

  },

  clear(options = {silently: false}) {

    if (STORE.size === 0) {
      return;
    }

    if (options.silently === true) {
      STORE.clear();
      return;
    }

    const keys = STORE.keys();

    STORE.clear();

    for (const key of keys) {
      dispatchEvent(key, void 0);
    }

  },

  bind(path, defaultValue) {
    return {
      id: this.id, // included for integrity check by internal modules
      path: path,
      defaultValue: defaultValue
    }
  },

  subscribe(path, handler, options = {}) {

    if (typeof path !== 'string' || typeof handler !== 'function' || (options === null || typeof options !== 'object')) {
      throw new Error(`Invalid arguments. Expect (path:String, handler:Function, [options:Object]`);
    }

    const event = Object.assign({
      scope: null,
      bubbles: false
    }, options, {
      handler: handler
    });

    if (EVENTS.has(path)) {
      EVENTS.get(path).push(event);
    } else {
      EVENTS.set(path, [event]);
    }

    return {
      unsubscribe() {
        const events = EVENTS.get(path);
        events.splice(events.indexOf(event), 1);
        if (events.length === 0) {
          EVENTS.delete(path);
        }
      }
    }

  }

};

Object.defineProperty(Store, 'id', {
  value: Symbol('Store ID')
});

// -------------------------------------

function getNode(root, keys) {

  if (root !== null && typeof root === 'object') {

    let node, key;

    for (let i = 1; i < keys.length; i++) {
      key = keys[i];
      node = i === 1 ? root : node[keys[i - 1]];
    }

    if (node.hasOwnProperty(key)) {
      return [node, key];
    } else {
      throw new Error(`Can not access store path: "${keys.join('/')}". Property ".../${key}" does not exist.`);
    }

  } else {
    throw new Error(`Can not access store path: "${keys.join('/')}". The value stored at: "${keys[0]}" is not object or array.`);
  }

}

function dispatchEvent(path, payload) {
  const event = EVENTS.get(path);
  if (event && event.length) {
    for (let i = 0, e; i < event.length; i++) {
      e = event[i];
      e.handler.call(e.scope, payload);
    }
  }
}

function bubbleEvent(path, value, keys, root) {

  let event = EVENTS.get(path);

  if (event && event.length) {

    let doBubble = false;
    let i, k, ev, e;
    for (i = 0; i < event.length; i++) {
      if (event[i].bubbles === true) {
        doBubble = true;
        break;
      }
    }

    if (doBubble === true) {

      const events = [];

      let key = keys[0];
      let node = root;
      let event = EVENTS.get(key);

      if (event && event.length) {
        for (i = 0; i < event.length; i++) {
          events.push([event[i], root]);
        }
      }

      for (i = 1; i < keys.length; i++) {
        key += `/${keys[i]}`;
        node = node[keys[i]];
        event = EVENTS.get(key);
        if (event && event.length) {
          for (k = 0; k < event.length; k++) {
            events.push([event[k], node]);
          }
        }
      }

      for (i = events.length - 1; i >= 0; i--) {
        ev = events[i];
        e = ev[0];
        e.handler.call(e.scope, ev[1]);
      }

    } else {

      for (i = 0; i < event.length; i++) {
        e = event[i];
        e.handler.call(e.scope, value);
      }

    }

  }

}