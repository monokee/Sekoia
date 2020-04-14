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
const ROUTE_HOOK_HANDLERS = new Map();
const ON_ROUTE_HANDLER_CACHE = new Map();
const ROUTES_STRUCT = {};

const DEFAULT_TRIGGER_OPTIONS = {
  params: {},
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

export const Router = {

  options: {
    recursionWarningCount: 5,
    recursionThrowCount: 10,
    defer: 0 // only execute navigations n milliseconds after the last call to Router.navigate
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

    options = Object.assign(options, DEFAULT_TRIGGER_OPTIONS);

    const {hash, query} = getRouteParts(route);

    const hooks = ROUTE_HOOK_HANDLERS.get(hash);

    if (hooks && hooks.length) {

      const params = Object.assign(buildParamsFromQueryString(query), options.params);

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

    if (listenerRegistered === false) {

      listenerRegistered = true;

      const urlHandler = forceReload => {
        Router.navigate(window.location.href, {
          revertible: false,
          forceReload: forceReload
        }).then(url => {
          window.history.replaceState(null, document.title, url);
        });
      };

      if (document.readyState === 'complete') {
        urlHandler(true);
      } else {
        document.addEventListener('readystatechange', () => {
          document.readyState === 'complete' && urlHandler(true);
        });
      }

      window.addEventListener('hashchange', () => {
        urlHandler(false);
      });

    }

  },

  navigate(route, options = {}) {
    options = Object.assign(options, DEFAULT_TRIGGER_OPTIONS);
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

  pendingParams = Object.assign(buildParamsFromQueryString(query), options.params);

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
        url.search = query;
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
        url += routeNode.value === ORIGIN || routeNode.value[0] === '#' ? routeNode.value : `/${routeNode.value}`;
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