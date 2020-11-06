import { deepClone, getArrayIntersection, getArrayTail } from "./utils.js";

const ORIGIN = window.location.origin + window.location.pathname;
const ABSOLUTE_ORIGIN_NAMES = [ORIGIN, window.location.hostname, window.location.hostname + '/', window.location.origin];
if (ORIGIN[ORIGIN.length - 1] !== '/') ABSOLUTE_ORIGIN_NAMES.push(ORIGIN + '/');
if (window.location.pathname && window.location.pathname !== '/') ABSOLUTE_ORIGIN_NAMES.push(window.location.pathname);
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
let CURRENT_QUERY_PARAMETERS = {};
let CURRENT_ROUTE_FRAGMENTS = ['/'];
if (window.location.hash) {
  CURRENT_ROUTE_FRAGMENTS.push(...window.location.hash.split('/'));
}

export const Router = {

  before(route, filter) {

    addPopStateListenerOnce();

    if (route === '*') {

      if (WILDCARD_FILTER !== null) {
        console.warn('[Cue.js] - Router.before(*, filter) - overwriting previously registered wildcard filter (*)');
      }

      WILDCARD_FILTER = filter;

    } else {

      const { hash } = getRouteParts(route);

      if (REGISTERED_FILTERS.has(hash)) {
        throw new Error(`[Cue.js] Router.beforeRoute() already has a filter for ${hash === '#' ? `${route} (root url)` : route}`);
      }

      REGISTERED_FILTERS.set(hash, filter);

    }

  },

  on(route, action) {

    addPopStateListenerOnce();

    if (route === '*') {

      if (WILDCARD_ACTIONS.indexOf(action) === -1) {
        WILDCARD_ACTIONS.push(action);
      }

    } else {

      const { hash } = getRouteParts(route);

      if (REGISTERED_ACTIONS.has(hash)) {
        throw new Error('[Cue.js] Router.onRoute() already has a action for "' + hash === '#' ? (route + ' (root url)') : route + '".');
      }

      REGISTERED_ACTIONS.add(hash);

      assignActionToRouteStruct(hash, action);

    }

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

    if (route.lastIndexOf('http', 0) === 0 && route !== window.location.href) {
      return window.location.href = route;
    }

    const { hash, query, rel } = getRouteParts(route);

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

              if (response !== rel) {

                reRoute(response);

              } else {

                performNavigation(hash, query, options.keepQuery, options.history);

              }

            });

          } else {

            performNavigation(hash, query, options.keepQuery, options.history);

          }

        }

      });

    } else if (REGISTERED_FILTERS.has(hash)) { // 2.0 - Apply route filters

      REGISTERED_FILTERS.get(hash)(rel, CURRENT_QUERY_PARAMETERS, response => {

        if (response !== rel) {

          reRoute(response);

        } else {

          performNavigation(hash, query, options.keepQuery, options.history);

        }

      });

    } else {

      performNavigation(hash, query, options.keepQuery, options.history);

    }

  },

  resolve(options = {}) {
    // should be called once after all filters and actions are registered
    this.navigate(window.location.href, options);
  },

  getQueryParameters(key) {
    if (!key) {
      return Object.assign({}, CURRENT_QUERY_PARAMETERS);
    } else {
      return CURRENT_QUERY_PARAMETERS[key];
    }
  },

  addQueryParameters(key, value) {

    if (typeof value === 'undefined' && typeof key === 'object') {
      for (const k in key) {
        CURRENT_QUERY_PARAMETERS[k] = key[k];
      }
    } else {
      CURRENT_QUERY_PARAMETERS[key] = value;
    }

    updateQueryString();

  },

  setQueryParameters(params) {
    CURRENT_QUERY_PARAMETERS = deepClone(params);
    updateQueryString();
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

  }

};

function addPopStateListenerOnce() {

  if (!HAS_POPSTATE_LISTENER) {

    HAS_POPSTATE_LISTENER = true;

    // never fired on initial page load in all up-to-date browsers
    window.addEventListener('popstate', () => {
      Router.navigate(window.location.href, {
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
  window.history[historyMode](null, document.title, ORIGIN_URL.toString());

}

function updateQueryString() {
  ORIGIN_URL.search = buildQueryStringFromParams(CURRENT_QUERY_PARAMETERS);
  window.history.replaceState(null, document.title, ORIGIN_URL.toString());
}

function reRoute(newRoute) {
  if (newRoute.lastIndexOf('http', 0) === 0) {
    return window.location.href = newRoute;
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
    } else {
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
    querystring += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]) + '&';
  }

  if (querystring === '?') {
    querystring = '';
  } else if (querystring[querystring.length - 1] === '&') {
    querystring = querystring.substring(0, querystring.length - 1);
  }

  return querystring;

}