const LocalStorage = window.localStorage;
const pendingCalls = new Map();

export const Server = {

  fetch(url, expires = 24 * 60 * 60, token) {

    return new Promise((resolve, reject) => {

      const data = getCache(url);

      if (data !== null) {
        resolve(JSON.parse(data));
      } else {
        makeCall(url, 'GET', token).then(response => {
          setCache(url, response, expires);
          resolve(JSON.parse(response));
        }).catch(error => {
          reject(error);
        });
      }

    });

  },

  post(url, data, token) {
    return new Promise((resolve, reject) => {
      makeCall(url, 'POST', token, data)
        .then(response => resolve(JSON.parse(response)))
        .catch(error => reject(error));
    });
  }

};

// --------------------------------------------------------

function setCache(url, value, expires) {
  const now = Date.now();
  const schedule = now + expires * 1000;
  if (typeof value === 'object') value = JSON.stringify(value);
  LocalStorage.setItem(url, value);
  LocalStorage.setItem(`${url}::ts`, schedule);
}

function getCache(url) {

  const timestamp = LocalStorage.getItem(`${url}::ts`);

  if (timestamp === null) {

    return null;

  } else {

    if (timestamp < Date.now()) {

      LocalStorage.removeItem(url);
      LocalStorage.removeItem(`${url}::ts`);

      return null;

    } else {

      return LocalStorage.getItem(url);

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

      const response = fetch(url, {
        method: method,
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: headers,
        redirect: 'follow',
        referrer: 'no-referrer',
        body: method === 'GET' ? null : JSON.stringify(data)
      }).then(response => {
        response.json().then(json => {
          pendingCalls.delete(url);
          resolve(json);
        })
      }).catch(error => {
        pendingCalls.delete(url);
        reject(error);
      });
    }));

    return pendingCalls.get(url);

  }

}