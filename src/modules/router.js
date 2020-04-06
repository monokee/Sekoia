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
const ON_ROUTE_HANDLER_CACHE = new Map();
const ROUTES_STRUCT = {};

const BEFORE_EACH_HANDLERS = [];
const AFTER_EACH_HANDLERS = [];

let recursions = 0;
let onRoutesResolved = null;
let resolveCancelled = false;
let resolvedBaseNode = null;
let routesDidResolve = false;

let pendingRoute = '';
let navigationInProgress = false;
let listenerRegistered = false;
let currentRoute = '';

const defaultResponse = {
  then: cb => cb(window.location.href)
};

export const Router = {

  options: {
    recursionWarningCount: 5,
    recursionThrowCount: 10
  },

  state: {
    get currentRoute() {
      return currentRoute;
    },
    navigation: {
      get inProgress() {
        return navigationInProgress;
      },
      get pendingRoute() {
        return pendingRoute;
      }
    }
  },

  beforeEach(handler, scope = null, once = false) {
    addRouterEvent(BEFORE_EACH_HANDLERS, handler, scope, once);
  },

  afterEach(handler, scope = null, once = false) {
    addRouterEvent(AFTER_EACH_HANDLERS, handler, scope, once);
  },

  subscribe(baseRoute, options) {

    if (!options) {
      throw new Error('Router.subscribe requires second parameter to be "options" object or "onRoute" handler function.');
    } else if (typeof options === 'function') {
      const onRoute = options;
      options = { onRoute };
    } else if (typeof options.beforeRoute !== 'function' && typeof options.onRoute !== 'function') {
      throw new Error('Router.subsribe requires "options" object with "beforeRoute", "onRoute" or both handler functions.');
    }

    baseRoute = sanitizeRoute(baseRoute);

    // dont register a route twice (do quick lookup)
    if (ROUTES.has(baseRoute)) {
      throw new Error('Router already has an active subscription for "' + baseRoute + '".');
    } else {
      ROUTES.add(baseRoute);
    }

    // create root struct if it doesnt exist
    const root = (ROUTES_STRUCT[ORIGIN] = ROUTES_STRUCT[ORIGIN] || {
      beforeRoute: undefined,
      onRoute: undefined,
      children: {}
    });

    // register the baseRoute structurally so that its callbacks can be resolved in order of change
    if (baseRoute === ORIGIN) {
      root.beforeRoute = options.beforeRoute;
      root.onRoute = options.onRoute;
    } else {
      const routeParts = baseRoute.split('/');
      const leafPart = routeParts[routeParts.length -1];
      routeParts.reduce((branch, part) => {
        if (branch[part]) {
          if (part === leafPart) {
            branch[part].beforeRoute = options.beforeRoute;
            branch[part].onRoute = options.onRoute;
          }
          return branch[part].children;
        } else {
          return (branch[part] = {
            beforeRoute: part === leafPart ? options.beforeRoute : undefined,
            onRoute: part === leafPart ? options.onRoute : undefined,
            children: {}
          }).children;
        }
      }, root.children);
    }

    if (listenerRegistered === false) {

      listenerRegistered = true;

      const urlHandler = () => {
        Router.navigate(window.location.href, false).then(route => {
          window.history.replaceState(null, document.title, route);
        });
      };

      if (document.readyState === 'complete') {
        urlHandler();
      } else {
        document.addEventListener('readystatechange', () => {
          document.readyState === 'complete' && urlHandler();
        });
      }

      window.addEventListener('hashchange', urlHandler);

    }

  },

  navigate(route, revertible = true, forceReload = false) {

    const routeParts = route.split(/\?(.+)/).filter(s => s);
    route = sanitizeRoute(routeParts.shift());
    const queryParams = routeParts[0] ? `?${routeParts[0]}` : window.location.search;

    if (route === currentRoute && forceReload === false) {
      fireRouterEvents(BEFORE_EACH_HANDLERS, currentRoute, route);
      fireRouterEvents(AFTER_EACH_HANDLERS, currentRoute, route);
      return defaultResponse;
    }

    if (navigationInProgress) {
      console.warn('Router.navigate to "' + route + '" not executed because navigation to "' + pendingRoute + '" is still in progress.');
      return defaultResponse;
    } else {
      pendingRoute = route;
      navigationInProgress = true;
    }

    fireRouterEvents(BEFORE_EACH_HANDLERS, currentRoute, route);

    return new Promise(resolve => {

      resolveRouteHandlers(route).then(resolvedStruct => {

        buildURLFromStruct(resolvedStruct).then(finalRoute => {

          if (forceReload === false && finalRoute === currentRoute) {

            navigationInProgress = false;
            fireRouterEvents(AFTER_EACH_HANDLERS, currentRoute, finalRoute);
            resolve(finalRoute + queryParams);

          } else {

            gatherRouteCallbacks(resolvedStruct).then(callbacks => {

              for (let i = 0, tuple, handler, param; i < callbacks.length; i++) {

                tuple = callbacks[i]; handler = tuple[0]; param = tuple[1];

                if (forceReload === true || !ON_ROUTE_HANDLER_CACHE.has(handler) || ON_ROUTE_HANDLER_CACHE.get(handler) !== param) {
                  handler(param); // TODO: when implemented as cue module, add handler to reaction queue
                  ON_ROUTE_HANDLER_CACHE.set(handler, param);
                }

              }

              currentRoute = finalRoute;

              if (revertible === true) {
                window.history.pushState(null, document.title, finalRoute + queryParams);
              }

              navigationInProgress = false;
              fireRouterEvents(AFTER_EACH_HANDLERS, currentRoute, finalRoute);
              resolve(finalRoute + queryParams);

            });
          }

        })

      });

    });

  }

};

// --------------------------------------------------------

function resolveRouteHandlers(route) {

  return new Promise(resolve => {

    recursions = 0;
    resolveCancelled = false;
    resolvedBaseNode = null;
    onRoutesResolved = resolve;
    routesDidResolve = false;

    if (!ROUTES_STRUCT[ORIGIN]) {
      resolve(null);
    }

    resolveRootRouteHandlers(route, resolve);

  });

}

function resolveRootRouteHandlers(route, resolve) {
  collectRouteNodes(ROUTES_STRUCT, [ORIGIN]).then(baseNode => {
    resolvedBaseNode = baseNode;
    if (route === ORIGIN) {
      if (routesDidResolve === false) {
        routesDidResolve = true;
        resolve(resolvedBaseNode);
      }
    } else {
      resolveHashRouteHandlers(route, resolvedBaseNode, resolve);
    }
  });
}

function resolveHashRouteHandlers(route, baseNode, resolve) {
  collectRouteNodes(ROUTES_STRUCT[ORIGIN].children, route.split('/')).then(hashNode => {
    if (routesDidResolve === false) {
      routesDidResolve = true;
      resolve(Object.assign(baseNode, {
        nextNode: hashNode
      }));
    }
  });
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

        Promise.resolve(frag.beforeRoute(iNextNodeValue)).then(oNextNodeValue => {

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

              if (oNextNodeValue === ORIGIN) {
                if (tryRecursion(parts)) {
                  resolveRootRouteHandlers(oNextNodeValue, onRoutesResolved);
                }
              } else if (oNextNodeValue[0] === '#') {
                if (tryRecursion(parts)) {
                  resolveHashRouteHandlers(oNextNodeValue, resolvedBaseNode, onRoutesResolved);
                }
              } else if (oNextNodeValue.lastIndexOf(ORIGIN, 0) === 0) {
                if (tryRecursion(parts)) {
                  resolveHashRouteHandlers(oNextNodeValue.substr(ORIGIN.length), resolvedBaseNode, onRoutesResolved);
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

function sanitizeRoute(route) {

  if (ALLOWED_ORIGIN_NAMES.indexOf(route) > -1) {
    return ORIGIN;
  }

  if (route[0] === '#') {
    return route;
  }

  route = removeAllowedOriginPrefix(route);

  if (route[0] !== '#') {
    throw new Error('Invalid Route: "' + route + '". Nested routes must be hash based.');
  }

  return route;

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

function addRouterEvent(stack, handler, scope, once) {

  let _handler;

  if (once === false) {
    _handler = handler.bind(scope);
  } else {
    _handler = (from, to) => {
      handler.call(scope, from, to);
      const i = stack.indexOf(_handler);
      stack.splice(i, 1);
    }
  }

  stack.push(_handler);

}

function fireRouterEvents(stack, from, to) {
  for (let i = 0; i < stack.length; i++) {
    stack[i](from, to);
  }
}