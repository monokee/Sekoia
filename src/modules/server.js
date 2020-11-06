import { hashString } from "./utils.js";

const CACHE_STORAGE = window.localStorage;
const PENDING_CALLS = new Map();
const REQUEST_START_EVENTS = [];
const REQUEST_STOP_EVENTS = [];
const ALL_KEYS = 'CUE_SERVER_CACHE::KEYS';
const EMPTY_CACHE_STORAGE_KEY = Symbol();

let PENDING_REQUEST_EVENT = null;

export const Server = {

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
        reject(error)
      }).finally(() => {
        PENDING_CALLS.delete(url)
      });

    }));

    return PENDING_CALLS.get(url);

  }

}

function handleAsTextOrJSON(res, next) {
  res.text().then(text => {
    try { next(JSON.parse(text)) } catch (_) { next(text) }
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