const LocalStorage = window.localStorage;
const pendingCalls = new Map();
const ALL_KEYS = 'CUE_SERVER_CACHE::KEYS';
const EMPTY_CACHE_STORAGE_KEY = Symbol();

export const Server = Object.defineProperty({

  fetch(url, expires = 0, token) {

    return new Promise((resolve, reject) => {

      const data = getCache(url);

      if (data === EMPTY_CACHE_STORAGE_KEY) {
        makeCall(url, 'GET', token).then(response => {
          setCache(url, response, expires);
          resolve(response);
        }).catch(error => {
          reject(error);
        });
      } else {
        resolve(data);
      }

    });

  },

  post(url, data, token) {
    return new Promise((resolve, reject) => {
      makeCall(url, 'POST', token, data)
        .then(response => resolve(response))
        .catch(error => reject(error));
    });
  },

}, 'clearCache', {
  value: clearCache
});

// --------------------------------------------------------

function setCache(url, value, expires) {

  const now = Date.now();
  const schedule = now + expires * 1000;

  if (typeof value === 'object') value = JSON.stringify(value);

  const url_stamped = `${url}::ts`;
  LocalStorage.setItem(url, value);
  LocalStorage.setItem(url_stamped, `${schedule}`);

  let allKeys = LocalStorage.getItem(ALL_KEYS);
  if (allKeys === null) {
    allKeys = `${url},${url_stamped},`;
  } else if (allKeys.indexOf(`${url},`) === -1) {
    allKeys = `${allKeys}${url},${url_stamped},`;
  }

  LocalStorage.setItem(ALL_KEYS, allKeys);

}

function getCache(url) {

  const timestamp = LocalStorage.getItem(`${url}::ts`);

  if (timestamp === null) {
    return EMPTY_CACHE_STORAGE_KEY;
  } else {
    if (Number(timestamp) < Date.now()) {
      clearCache(url);
      return EMPTY_CACHE_STORAGE_KEY;
    } else {
      return JSON.parse(LocalStorage.getItem(url));
    }
  }

}

function clearCache(url) {
  if (url) {
    if (LocalStorage.getItem(url) !== null) {
      const url_stamped = `${url}::ts`;
      LocalStorage.removeItem(url);
      LocalStorage.removeItem(url_stamped);
      const _allKeys = LocalStorage.getItem(ALL_KEYS);
      if (_allKeys !== null) {
        const allKeys = _allKeys.split(',');
        allKeys.splice(allKeys.indexOf(url), 1);
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
        reject(error)
      }).finally(() => {
        pendingCalls.delete(url)
      });

    }));

    return pendingCalls.get(url);

  }

}