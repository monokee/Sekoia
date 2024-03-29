import { deepClone } from "../utils/deep-clone.js";

const LOCATION = window.location;
const HISTORY = window.history;
const ORIGIN = LOCATION.origin + LOCATION.pathname;

const ABSOLUTE_ORIGIN_NAMES = [ORIGIN, LOCATION.hostname, LOCATION.hostname + '/', LOCATION.origin];
if (ORIGIN[ORIGIN.length - 1] !== '/') {
  ABSOLUTE_ORIGIN_NAMES.push(ORIGIN + '/');
}
if (LOCATION.pathname && LOCATION.pathname !== '/') {
  ABSOLUTE_ORIGIN_NAMES.push(LOCATION.pathname);
}

const ALLOWED_ORIGIN_NAMES = ['/', '#', '/#', '/#/', ...ABSOLUTE_ORIGIN_NAMES];
const ORIGIN_URL = new URL(ORIGIN);
const CLEAN_ORIGIN = removeTrailingSlash(ORIGIN);

const REGISTERED_FILTERS = new Map();
const REGISTERED_ACTIONS = new Set();

const WILDCARD_ACTIONS = [];
let WILDCARD_FILTER = null;

const ROUTES_STRUCT = {};

const DEFAULT_TRIGGER_OPTIONS = {
  params: {},
  keepQuery: true,
  forceReload: false,
  history: 'pushState'
};

let HAS_POPSTATE_LISTENER = false;
let CURRENT_QUERY_PARAMETERS = buildParamsFromQueryString(LOCATION.search);
let CURRENT_ROUTE_FRAGMENTS = ['/'];
if (LOCATION.hash) {
  CURRENT_ROUTE_FRAGMENTS.push(...LOCATION.hash.split('/'));
}

export const Router = {

  registerRedirects(redirects) {

    /**
     * A higher level abstraction over Router.before.
     * Register dynamic redirect hooks for individual routes.
     * Use wildcard * to redirect any request conditionally.
     * Example:
     * redirects = {
     *  '/': '#home', -> redirect every root request to #home
     *  '#public': false -> don't redirect. same as omitting property completely
     *  '#protected': queryParams => {
     *    if (System.currentUser.role !== 'admin') {
     *      return '#403' -> redirect non-admins to 403 page. else undefined is returned so we don't redirect.
     *    }
     *  }
     *}
     * */

    const requestPermission = (path, params, respondWith) => {

      // when no filter is registered for this path we allow it
      if (!redirects.hasOwnProperty(path)) {
        return respondWith(path);
      }

      const filter = redirects[path];
      const redirect = typeof filter === 'function' ? filter(params) : filter;

      if (!redirect || typeof redirect !== 'string') { // falsy values don't redirect
        respondWith(path);
      } else { // redirect non-empty strings
        respondWith(redirect);
      }

    };

    for (const path in redirects) {
      if (redirects.hasOwnProperty(path) && !this.hasFilter(path)) {
        this.before(path, requestPermission);
      }
    }

    return this;

  },

  before(route, filter) {

    if (typeof route === 'object') {

      for (const rt in route) {
        if (route.hasOwnProperty(rt)) {
          this.on(rt, route[rt]);
        }
      }

    } else {

      addPopStateListenerOnce();

      if (route === '*') {

        if (WILDCARD_FILTER !== null) {
          console.warn('Router.before(*, filter) - overwriting previously registered wildcard filter (*)');
        }

        WILDCARD_FILTER = filter;

      } else {

        const { hash } = getRouteParts(route);

        if (REGISTERED_FILTERS.has(hash)) {
          throw new Error(`Router.beforeRoute() already has a filter for ${hash === '#' ? `${route} (root url)` : route}`);
        }

        REGISTERED_FILTERS.set(hash, filter);

      }

    }

    return this;

  },

  on(route, action) {

    if (typeof route === 'object') {

      for (const rt in route) {
        if (route.hasOwnProperty(rt)) {
          this.on(rt, route[rt]);
        }
      }

    } else {

      addPopStateListenerOnce();

      if (route === '*') {

        if (WILDCARD_ACTIONS.indexOf(action) === -1) {
          WILDCARD_ACTIONS.push(action);
        }

      } else {

        const {hash} = getRouteParts(route);

        if (REGISTERED_ACTIONS.has(hash)) {
          throw new Error('Router.onRoute() already has a action for "' + hash === '#' ? (route + ' (root url)') : route + '".');
        }

        REGISTERED_ACTIONS.add(hash);

        assignActionToRouteStruct(hash, action);

      }

    }

    return this;

  },

  resolve(options = {}) {
    // should be called once after all filters and actions have been registered
    this.navigate(LOCATION.href, options);
    return this;
  },

  hasFilter(route) {
    if (route === '*') {
      return WILDCARD_FILTER !== null;
    } else {
      const { hash } = getRouteParts(route);
      return REGISTERED_FILTERS.has(hash);
    }
  },

  hasAction(route) {
    if (route === '*') {
      return WILDCARD_ACTIONS.length > 0;
    } else {
      const { hash } = getRouteParts(route);
      return REGISTERED_ACTIONS.has(hash);
    }
  },

  navigate(route, options = {}) {

    if (route.lastIndexOf('http', 0) === 0 && route !== LOCATION.href) {

      LOCATION.href = route;

    } else {

      const {hash, query, rel} = getRouteParts(route);

      options = Object.assign({}, DEFAULT_TRIGGER_OPTIONS, options);

      if (options.keepQuery === true) {
        Object.assign(CURRENT_QUERY_PARAMETERS, buildParamsFromQueryString(query));
      } else {
        CURRENT_QUERY_PARAMETERS = buildParamsFromQueryString(query);
      }

      // Filters
      if (WILDCARD_FILTER) { // 1.0 - Apply wildcard filter

        WILDCARD_FILTER(rel, CURRENT_QUERY_PARAMETERS, response => {

          if (response !== rel) {

            reRoute(response);

          } else {

            if (REGISTERED_FILTERS.has(hash)) { // 1.1 - Apply route filters

              REGISTERED_FILTERS.get(hash)(rel, CURRENT_QUERY_PARAMETERS, response => {

                if (response && typeof response === 'string') { // only continue if response is truthy and string

                  if (response !== rel) {

                    reRoute(response);

                  } else {

                    performNavigation(hash, query, options.keepQuery, options.history);

                  }

                }

              });

            } else {

              performNavigation(hash, query, options.keepQuery, options.history);

            }

          }

        });

      } else if (REGISTERED_FILTERS.has(hash)) { // 2.0 - Apply route filters

        REGISTERED_FILTERS.get(hash)(rel, CURRENT_QUERY_PARAMETERS, response => {

          if (response && typeof response === 'string') {

            if (response !== rel) {

              reRoute(response);

            } else {

              performNavigation(hash, query, options.keepQuery, options.history);

            }

          }

        });

      } else {

        performNavigation(hash, query, options.keepQuery, options.history);

      }

    }

    return this;

  },

  getQueryParameters(key) {
    if (!key) {
      return Object.assign({}, CURRENT_QUERY_PARAMETERS);
    } else {
      return CURRENT_QUERY_PARAMETERS[key];
    }
  },

  addQueryParameters(key, value) {

    if (typeof key === 'object') {
      for (const k in key) {
        if (key.hasOwnProperty(k)) {
          CURRENT_QUERY_PARAMETERS[k] = key[k];
        }
      }
    } else {
      CURRENT_QUERY_PARAMETERS[key] = value;
    }

    updateQueryString();

    return this;

  },

  setQueryParameters(params) {
    CURRENT_QUERY_PARAMETERS = deepClone(params);
    updateQueryString();
    return this;
  },

  removeQueryParameters(key) {

    if (!key) {
      CURRENT_QUERY_PARAMETERS = {};
    } else if (Array.isArray(key)) {
      key.forEach(k => {
        if (CURRENT_QUERY_PARAMETERS[k]) {
          delete CURRENT_QUERY_PARAMETERS[k];
        }
      });
    } else if (CURRENT_QUERY_PARAMETERS[key]) {
      delete CURRENT_QUERY_PARAMETERS[key];
    }

    updateQueryString();

    return this;

  }

};

function addPopStateListenerOnce() {

  if (!HAS_POPSTATE_LISTENER) {

    HAS_POPSTATE_LISTENER = true;

    // never fired on initial page load in all up-to-date browsers
    window.addEventListener('popstate', () => {
      Router.navigate(LOCATION.href, {
        history: 'replaceState',
        forceReload: false
      });
    });

  }

}

function performNavigation(hash, query, keepQuery, historyMode) {

  executeWildCardActions(hash);
  executeRouteActions(hash);

  ORIGIN_URL.hash = hash;
  ORIGIN_URL.search = keepQuery ? buildQueryStringFromParams(CURRENT_QUERY_PARAMETERS) : query;
  HISTORY[historyMode](null, document.title, ORIGIN_URL.toString());

}

function updateQueryString() {
  ORIGIN_URL.search = buildQueryStringFromParams(CURRENT_QUERY_PARAMETERS);
  HISTORY.replaceState(null, document.title, ORIGIN_URL.toString());
}

function reRoute(newRoute) {
  if (newRoute.lastIndexOf('http', 0) === 0) {
    return LOCATION.href = newRoute;
  } else {
    return Router.navigate(newRoute, {
      history: 'replaceState',
      forceReload: false
    });
  }
}

function executeWildCardActions(hash) {

  hash = hash === '#' ? '' : hash;
  const completePath =  CLEAN_ORIGIN + hash;

  for (let i = 0; i < WILDCARD_ACTIONS.length; i++) {
    WILDCARD_ACTIONS[i](completePath, CURRENT_QUERY_PARAMETERS);
  }

}

function executeRouteActions(hash) {

  const routeFragments = ['/'];

  if (hash !== '#') {
    routeFragments.push(...hash.split('/'));
  }

  // find the intersection between the last route and the next route
  const intersection = getArrayIntersection(CURRENT_ROUTE_FRAGMENTS, routeFragments);

  // recompute the last intersecting fragment + any tail that might have been added
  const fragmentsToRecompute = [intersection[intersection.length - 1]];

  if (routeFragments.length > intersection.length) {
    fragmentsToRecompute.push(...getArrayTail(intersection, routeFragments));
  }

  // find the first node that needs to be recomputed
  let currentRouteNode = ROUTES_STRUCT;
  let fragment;

  for (let i = 0; i < intersection.length; i ++) {

    fragment = intersection[i];

    if (fragment === fragmentsToRecompute[0]) { // detect overlap
      fragment = fragmentsToRecompute.shift(); // remove first element (only there for overlap detection)
      break;
    } else if (currentRouteNode && currentRouteNode[fragment]) {
      currentRouteNode = currentRouteNode[fragment].children;
    }

  }

  // execute actions
  while (currentRouteNode[fragment] && fragmentsToRecompute.length) {

    // call action with joined remaining fragments as "path" argument
    if (currentRouteNode[fragment].action) {
      currentRouteNode[fragment].action(fragmentsToRecompute.join('/'), CURRENT_QUERY_PARAMETERS);
    }

    currentRouteNode = currentRouteNode[fragment].children;
    fragment = fragmentsToRecompute.shift();

  }

  // execute last action with single trailing slash as "path" argument
  if (currentRouteNode[fragment] && currentRouteNode[fragment].action) {
    currentRouteNode[fragment].action('/', CURRENT_QUERY_PARAMETERS);
  }

  // update current route fragments
  CURRENT_ROUTE_FRAGMENTS = routeFragments;

}

function assignActionToRouteStruct(hash, action) {

  // create root struct if it doesnt exist
  const structOrigin = ROUTES_STRUCT['/'] || (ROUTES_STRUCT['/'] = {
    action: void 0,
    children: {}
  });

  // register the route structurally so that its callbacks can be resolved in order of change
  if (hash === '#') { // is root

    structOrigin.action = action;

  } else {

    const hashParts = hash.split('/');
    const leafPart = hashParts[hashParts.length - 1];

    hashParts.reduce((branch, part) => {

      if (branch[part]) {

        if (part === leafPart) {
          branch[part].action = action;
        }

        return branch[part].children;

      } else {

        return (branch[part] = {
          action: part === leafPart ? action : void 0,
          children: {}
        }).children;

      }

    }, structOrigin.children);

  }

}

function getRouteParts(route) {

  if (ALLOWED_ORIGIN_NAMES.indexOf(route) > -1) {
    return {
      rel: '/',
      abs: ORIGIN,
      hash: '#',
      query: ''
    }
  }

  if (route[0] === '?' || route[0] === '#') {
    const {hash, query} = getHashAndQuery(route);
    return {
      rel: convertHashToRelativePath(hash),
      abs: ORIGIN + hash,
      hash: hash || '#',
      query: query
    }
  }

  route = removeAllowedOriginPrefix(route);

  if (route [0] !== '?' && route[0] !== '#') {
    throw new Error('Invalid Route: "' + route + '". Non-root paths must start with ? query or # hash.');
  }

  const {hash, query} = getHashAndQuery(route);

  return {
    rel: convertHashToRelativePath(hash),
    abs: ORIGIN + hash,
    hash: hash || '#',
    query: query
  }

}

function getHashAndQuery(route) {

  const indexOfHash = route.indexOf('#');
  const indexOfQuestion = route.indexOf('?');

  if (indexOfHash === -1) { // url has no hash
    return {
      hash: '',
      query: removeTrailingSlash(new URL(route, ORIGIN).search)
    }
  }

  if (indexOfQuestion === -1) { // url has no query
    return {
      hash: removeTrailingSlash(new URL(route, ORIGIN).hash),
      query: ''
    }
  }

  const url = new URL(route, ORIGIN);

  if (indexOfQuestion < indexOfHash) { // standard compliant url with query before hash
    return {
      hash: removeTrailingSlash(url.hash),
      query: removeTrailingSlash(url.search)
    }
  }

  // non-standard url with hash before query (query is inside the hash)
  let hash = url.hash;
  const query = hash.slice(hash.indexOf('?'));
  hash = hash.replace(query, '');

  return {
    hash: removeTrailingSlash(hash),
    query: removeTrailingSlash(query)
  }

}

function convertHashToRelativePath(hash) {
  return (hash === '#' ? '/' : hash) || '/';
}

function removeTrailingSlash(str) {
  return str[str.length - 1] === '/' ? str.substring(0, str.length - 1) : str;
}

function removeAllowedOriginPrefix(route) {
  const lop = getLongestOccurringPrefix(route, ALLOWED_ORIGIN_NAMES);
  const hashPart = lop ? route.substr(lop.length) : route;
  return hashPart.lastIndexOf('/', 0) === 0 ? hashPart.substr(1) : hashPart;
}

function getLongestOccurringPrefix(s, prefixes) {
  return prefixes
    .filter(x => s.lastIndexOf(x, 0) === 0)
    .sort((a, b) => b.length - a.length)[0];
}

function getArrayIntersection(a, b) {

  const intersection = [];

  for (let x = 0; x < a.length; x++) {
    for (let y = 0; y < b.length; y++) {
      if (a[x] === b[y]) {
        intersection.push(a[x]);
        break;
      }
    }
  }

  return intersection;

}

function getArrayTail(a, b) {

  const tail = [];

  for (let i = a.length; i < b.length; i++) {
    tail.push(b[i]);
  }

  return tail;

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

function buildQueryStringFromParams(params) {

  let querystring = '?';

  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      querystring += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]) + '&';
    }
  }

  if (querystring === '?') {
    querystring = '';
  } else if (querystring[querystring.length - 1] === '&') {
    querystring = querystring.substring(0, querystring.length - 1);
  }

  return querystring;

}