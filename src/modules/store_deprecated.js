import {deepEqual} from "./utils.js";

const EVENTS = new Map();

const LocalStorage = window.localStorage;
const KEY_ID = 'VCS::';
const DO_PARSE = `${KEY_ID}PARSE::`;
const DO_PARSE_LENGTH = DO_PARSE.length;
const ALL_KEYS = `${KEY_ID}ALL_KEYS`;

export const Store = {

  get(path) {

    if (!path) {

      const entireStore = {};

      const keys = LocalStorage.getItem(ALL_KEYS);

      if (keys !== null) {

        const allKeys = keys.split(',');

        for (let i = 0; i < allKeys.length; i++) {
          const str = LocalStorage.getItem(`${KEY_ID}${allKeys[i]}`);
          entireStore[allKeys[i]] = isParsable(str) ? JSON.parse(str.substring(DO_PARSE_LENGTH)) : str;
        }

      }

      return entireStore;

    }

    const keys = path.split('/');
    const str = LocalStorage.getItem(`${KEY_ID}${keys[0]}`);

    if (str === null) return null;

    if (!isParsable(str)) return str;

    const data = JSON.parse(str.substring(DO_PARSE_LENGTH));

    if (keys.length > 1) { // slash into object tree
      const [targetNode, targetKey] = getNode(data, keys);
      return targetNode[targetKey];
    }

    return data;

  },

  set(path, value) {

    if (arguments.length === 1) {

      // assume "path" to be store singleton object
      if (typeof path !== 'object' || path === null) {
        throw new Error('Invalid arguments provided to Store.set...');
      }

      this.clear(true);
      for (const key in path) this.set(key, path[key]);
      return true;

    }

    const keys = path.split('/');
    const keyLocal = `${KEY_ID}${keys[0]}`;
    const str = LocalStorage.getItem(keyLocal);

    if (keys.length > 1) { // setting a sub-level prop

      if (isParsable(str)) {

        const root = JSON.parse(str.substring(DO_PARSE_LENGTH));
        const [node, key] = getNode(root, keys);

        if (!deepEqual(node[key], value)) {
          node[key] = value;
          LocalStorage.setItem(keyLocal, `${DO_PARSE}${JSON.stringify(root, jsonReplacer)}`);
          bubbleEvent(path, value, keys, root);
          return true;
        } else {
          return false;
        }

      } else {
        throw new Error(`Cannot set property at path: "${path}" because the current value is stored as a string.`);
      }

    }

    // setting top-level prop

    if (str === null) { // first write

      if (typeof value === 'string') { // simple write
        LocalStorage.setItem(keyLocal, value);
      } else {
        LocalStorage.setItem(keyLocal, `${DO_PARSE}${JSON.stringify(value)}`);
      }

      // when setting new top-level property, collect its (unique) storage key
      let allKeys = LocalStorage.getItem(ALL_KEYS);
      if (allKeys === null) {
        allKeys = `${keyLocal},`;
      } else if (allKeys.indexOf(`${keyLocal},`) === -1) {
        allKeys = `${allKeys}${keyLocal},`;
      }

      LocalStorage.setItem(ALL_KEYS, allKeys);
      dispatchEvent(path, value);
      return true;

    }

    if (isParsable(str)) {

      const root = JSON.parse(str.substring(DO_PARSE_LENGTH));

      if (!deepEqual(root, value)) {
        LocalStorage.setItem(keyLocal, `${DO_PARSE}${JSON.stringify(value, jsonReplacer)}`);
        dispatchEvent(path, value);
        return true;
      } else {
        return false;
      }

    }

    if (str !== value) {
      LocalStorage.setItem(keyLocal, `${JSON.stringify(value, jsonReplacer)}`);
      dispatchEvent(path, value);
      return true;
    }

    return false;

  },

  has(path) {

    const keys = path.split('/');
    const str = LocalStorage.getItem(`${KEY_ID}${keys[0]}`);

    if (keys.length > 1) {

      if (isParsable(str) === false) {

        return false;

      } else {

        try {
          getNode(JSON.parse(str.substring(DO_PARSE_LENGTH)), keys);
          return true;
        } catch (e) {
          return false;
        }

      }

    } else {

      return str !== null;

    }

  },

  remove(path) {

    const keys = path.split('/');
    const keyLocal = `${KEY_ID}${keys[0]}`;
    const str = LocalStorage.getItem(keyLocal);

    if (str === null) return;

    if (keys.length > 1) {

      if (isParsable(str) === true) {

        const root = JSON.parse(str.substring(DO_PARSE_LENGTH));
        const [targetNode, targetKey] = getNode(root, keys);

        if (Array.isArray(targetNode)) {
          targetNode.splice(parseInt(targetKey), 1);
        } else {
          delete targetNode[targetKey];
        }

        LocalStorage.setItem(keyLocal, `${DO_PARSE}${JSON.stringify(root, jsonReplacer)}`);
        bubbleEvent(path, undefined, keys, root);

      } else {
        throw new Error(`Cannot delete property at path: "${path}" because the current value is stored as a string.`);
      }

    } else {

      LocalStorage.removeItem(keyLocal);

      const allKeys = LocalStorage.getItem(ALL_KEYS).split(',');
      allKeys.splice(allKeys.indexOf(keyLocal), 1);
      LocalStorage.setItem(ALL_KEYS, `${allKeys.join(',')},`);

      dispatchEvent(path, undefined);

    }

  },

  clear(silently = false) {

    const keys = LocalStorage.getItem(ALL_KEYS);

    if (keys !== null) {

      const allKeys = keys.split(',');

      for (let i = 0; i < allKeys.length; i++) {
        LocalStorage.removeItem(allKeys[i]);
        silently === false && dispatchEvent(allKeys[i], undefined);
      }

      LocalStorage.removeItem(ALL_KEYS);

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

// ----------------------------------

function isParsable(str) {
  for (let i = 0; i < DO_PARSE_LENGTH; i++) {
    if (str[i] !== DO_PARSE[i]) return false;
  }
  return true;
}

function jsonReplacer(key, value) {
  return value === undefined ? null : value;
}

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

function dispatchEvent(key, payload) {
  const event = EVENTS.get(key);
  if (event && event.length) {
    for (let i = 0, e; i < event.length; i++) {
      e = event[i];
      e.handler.call(e.scope, payload);
    }
  }
}