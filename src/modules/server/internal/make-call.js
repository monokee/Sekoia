const PENDING_CALLS = new Map();

export const ON_REQUEST_START = new Set();
export const ON_REQUEST_STOP = new Set();

export function makeCall(url, method, token, data = {}) {

  if (PENDING_CALLS.has(url)) {

    return PENDING_CALLS.get(url);

  } else {

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fire(ON_REQUEST_START, url);

    return PENDING_CALLS.set(url, fetch(url, {
      method: method,
      mode: 'cors',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: headers,
      redirect: 'follow',
      referrer: 'no-referrer',
      body: method === 'GET' ? null : typeof data === 'string' ? data : JSON.stringify(data)
    }).then(res => {
      if (!res.ok || res.status !== 204) {
        return res.text().then(text => {
          try {
            return JSON.parse(text);
          } catch (_) {
            return text;
          }
        });
      } else {
        return {};
      }
    }).finally(() => {
      PENDING_CALLS.delete(url);
      fire(ON_REQUEST_STOP, url);
    })).get(url);

  }

}

function fire(events, url) {
  for (const event of events) {
    if (event.includes === '*' || url.includes(event.includes)) {
      event.handler();
    }
  }
}