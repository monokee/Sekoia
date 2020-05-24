import { RESOLVED_PROMISE, deepEqual, deepClone } from "./utils.js";
import { Reactor } from "./reactor.js";

const STORE = new Map();
const EVENTS = new Map();

export const Store = Object.defineProperty({

  get(path) {

    if (!path) {

      const entireStore = {};

      for (const tuple of STORE.entries()) {
        entireStore[tuple[0]] = deepClone(tuple[1]);
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
      return deepClone(targetNode[targetKey]);
    }

    return deepClone(root);

  },

  set(path, value) {

    if (path && typeof path === 'object') {

      let didChange = false;

      for (const prop in path) {

        const keys = prop.split('/');
        const root = STORE.get(keys[0]);
        const newValue = path[prop];

        if (keys.length > 1) {
          const [targetNode, targetKey] = getNode(root, keys);
          if (!deepEqual(targetNode[targetKey], newValue)) {
            didChange = true;
            targetNode[targetKey] = newValue;
            bubbleEvent(prop, newValue, keys, root);
          }
        } else if (root === void 0 || !deepEqual(root, newValue)) {
          didChange = true;
          STORE.set(prop, newValue);
          dispatchEvent(prop, newValue);
        }

      }

      return didChange ? Reactor.react() : RESOLVED_PROMISE;

    }

    const keys = path.split('/');
    const root = STORE.get(keys[0]);

    if (keys.length > 1) { // sub-property

      const [targetNode, targetKey] = getNode(root, keys);

      if (deepEqual(targetNode[targetKey], value)) {
        return RESOLVED_PROMISE;
      }

      targetNode[targetKey] = value;
      return bubbleEvent(path, value, keys, root);

    }

    if (root === void 0 || !deepEqual(root, value)) { // first write or full replace
      STORE.set(path, value);
      return dispatchEvent(path, value);
    }

    return RESOLVED_PROMISE;

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
      return RESOLVED_PROMISE;
    }

    if (keys.length > 1) {

      const [targetNode, targetKey] = getNode(root, keys);

      if (Array.isArray(targetNode)) {
        targetNode.splice(parseInt(targetKey), 1);
      } else {
        delete targetNode[targetKey];
      }

      return bubbleEvent(path, void 0, keys, root);

    }

    STORE.delete(keys[0]);
    return dispatchEvent(path, void 0);

  },

  clear(options = {silently: false}) {

    if (STORE.size === 0) {
      return RESOLVED_PROMISE;
    }

    if (options.silently === true) {
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

  bind(path, defaultValue) {
    const storeBinding = {id: this.id, path};
    return arguments.length === 1
      ? storeBinding
      : Object.assign(storeBinding, {defaultValue});
  },

  subscribe(path, handler, options = {}) {

    if (typeof path !== 'string' || typeof handler !== 'function' || (options === null || typeof options !== 'object')) {
      throw new Error(`Invalid arguments. Expect (path:String, handler:Function, [options:Object]`);
    }

    const event = Object.assign({
      bubbles: false,
      autorun: true,
    }, options, {
      handler: options.scope ? handler.bind(options.scope) : handler
    });

    if (EVENTS.has(path)) {
      EVENTS.get(path).push(event);
    } else {
      EVENTS.set(path, [event]);
    }

    if (event.autorun === true) {

      const keys = path.split('/');
      const root = STORE.get(keys[0]);

      let warn = false;

      if (root === void 0) {
        warn = true;
      } else if (keys.length > 1) {
        const [targetNode, targetKey] = getNode(root, keys);
        if (targetNode[targetKey] === void 0) {
          warn = true;
        }
      }

      if (warn === true) {
        console.warn(`Can not auto-run Store subscription handler because value at "${path}" is undefined. Pass {autorun: false} option to avoid this warning.`);
      } else {
        if (event.bubbles === false) {
          dispatchEvent(path, STORE.get(path));
        } else {
          const keys = path.split('/');
          bubbleEvent(path, STORE.get(path), keys, STORE.get(keys[0]));
        }
      }
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

}, 'id', {
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
  if (event) {
    for (let i = 0; i < event.length; i++) {
      Reactor.cueEvent(event[i].handler, payload);
    }
    return Reactor.react();
  } else {
    return RESOLVED_PROMISE;
  }
}

function bubbleEvent(path, value, keys, root) {

  const Event = EVENTS.get(path);

  if (Event) {

    let doBubble = false;
    let i, k, ev, e;
    for (i = 0; i < Event.length; i++) {
      if (Event[i].bubbles === true) {
        doBubble = true;
        break;
      }
    }

    if (doBubble === true) {

      const events = [];

      let key = keys[0];
      let node = root;
      let event = EVENTS.get(key);

      if (event) {
        for (i = 0; i < event.length; i++) {
          events.push([event[i], root]);
        }
      }

      for (i = 1; i < keys.length; i++) {
        key += '/' + keys[i];
        node = node[keys[i]];
        event = EVENTS.get(key);
        if (event) {
          for (k = 0; k < event.length; k++) {
            events.push([event[k], node]);
          }
        }
      }

      for (i = events.length - 1; i >= 0; i--) {
        ev = events[i];
        e = ev[0];
        Reactor.cueEvent(ev[0].handler, ev[1]);
      }

    } else {

      for (i = 0; i < Event.length; i++) {
        Reactor.cueEvent(Event[i].handler, value);
      }

    }

    return Reactor.react();

  } else {

    return RESOLVED_PROMISE;

  }

}