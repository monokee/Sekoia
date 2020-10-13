const ORIGIN = window.location.origin + window.location.pathname;
const ABSOLUTE_ORIGIN_NAMES = [ORIGIN, window.location.hostname, window.location.hostname + '/', window.location.origin];
if (ORIGIN[ORIGIN.length -1] !== '/') ABSOLUTE_ORIGIN_NAMES.push(ORIGIN + '/');
if (window.location.pathname && window.location.pathname !== '/') ABSOLUTE_ORIGIN_NAMES.push(window.location.pathname);
const ALLOWED_ORIGIN_NAMES = ['/', '#', '/#', '/#/', ...ABSOLUTE_ORIGIN_NAMES];
const ORIGIN_URL = new URL(ORIGIN);

const REGISTERED_ROUTES = new Set();
const ROUTES_STRUCT = {};

const DEFAULT_TRIGGER_OPTIONS = {
  params: {},
  keepQuery: true,
  forceReload: false,
  history: 'pushState'
};

let HAS_POPSTATE_LISTENER = false;
let SUBSCRIPTION_SCHEDULER = null;
let CURRENT_QUERY_PARAMETERS = {};

export const Router = {

  subscribe(route, options) {

    if (!options) {
      throw new Error('[Cue.js] - Router.subscribe() requires second parameter to be "options" object or "onRoute" handler function.');
    } else if (typeof options === 'function') {
      const onRoute = options;
      options = { onRoute };
    } else if (typeof options.beforeRoute !== 'function' && typeof options.onRoute !== 'function') {
      throw new Error('[Cue.js] - Router.subscribe requires "options" object with "beforeRoute", "onRoute" or both handler functions.');
    }

    const { hash } = getRouteParts(route);

    // dont register a route twice (do quick lookup)
    if (REGISTERED_ROUTES.has(hash)) {
      throw new Error('[Cue.js] Router already has an active subscription for "' + hash === '#' ? (route + ' (root url)') : route + '".');
    } else {
      REGISTERED_ROUTES.add(hash);
    }

    assignHandlersToRouteStruct(hash, options.beforeRoute, options.onRoute);

    // Auto-run subscription
    if (options.autorun !== false) { // run unless explicitly set to false
      // deferred autorun
      clearTimeout(SUBSCRIPTION_SCHEDULER);
      SUBSCRIPTION_SCHEDULER = setTimeout(() => {
        this.navigate(window.location.href, {
          history: 'replaceState',
          forceReload: true
        });
      }, 75);
    }

    // Add PopState Listeners once
    if (!HAS_POPSTATE_LISTENER) {
      HAS_POPSTATE_LISTENER = true;
      window.addEventListener('popstate', () => {
        this.navigate(window.location.href, {
          history: 'replaceState',
          forceReload: false
        });
      });
    }

  },

  navigate(route, options = {}) {

    options = Object.assign({}, DEFAULT_TRIGGER_OPTIONS, options);

    const { hash, query, rel } = getRouteParts(route);

    const routeFragments = ['/'];
    if (hash !== '#') {
      routeFragments.push(...hash.split('/'));
    }

    if (options.keepQuery === true) {
      Object.assign(CURRENT_QUERY_PARAMETERS, buildParamsFromQueryString(query));
    } else {
      CURRENT_QUERY_PARAMETERS = buildParamsFromQueryString(query);
    }

    stepOverRouteNodes(ROUTES_STRUCT, routeFragments, rel, () => {
      ORIGIN_URL.hash = hash;
      ORIGIN_URL.search = options.keepQuery ? buildQueryStringFromParams(CURRENT_QUERY_PARAMETERS) : query;
      window.history[options.history](null, document.title, ORIGIN_URL.toString());
    });

  }

};

function stepOverRouteNodes(currentNode, remainingRouteFragments, rel, onComplete) {

  const nextRouteFragment = remainingRouteFragments.shift();

  if (currentNode[nextRouteFragment]) {

    if (currentNode[nextRouteFragment].beforeRoute) {

      currentNode[nextRouteFragment].beforeRoute(rel, CURRENT_QUERY_PARAMETERS, response => {

        if (response === rel) {
          currentNode[nextRouteFragment].onRoute && currentNode[nextRouteFragment].onRoute(rel, CURRENT_QUERY_PARAMETERS);
          stepOverRouteNodes(currentNode[nextRouteFragment].children, remainingRouteFragments, rel, onComplete);
        } else {
          Router.navigate(response, {
            history: 'replaceState',
            forceReload: false
          });
        }

      });

    } else {

      currentNode[nextRouteFragment].onRoute && currentNode[nextRouteFragment].onRoute(rel, CURRENT_QUERY_PARAMETERS);
      stepOverRouteNodes(currentNode[nextRouteFragment].children, remainingRouteFragments, rel, onComplete);

    }

  } else {

    onComplete();

  }

}

function assignHandlersToRouteStruct(hash, beforeRoute, onRoute) {

  const isRoot = hash === '#';

  // create root struct if it doesnt exist
  const structOrigin = (ROUTES_STRUCT['/'] = ROUTES_STRUCT['/'] || {
    beforeRoute: void 0,
    onRoute: void 0,
    children: {}
  });

  // register the route structurally so that its callbacks can be resolved in order of change
  if (isRoot) {

    structOrigin.beforeRoute = beforeRoute;
    structOrigin.onRoute = onRoute;

  } else {

    const hashParts = hash.split('/');
    const leafPart = hashParts[hashParts.length - 1];

    hashParts.reduce((branch, part) => {

      if (branch[part]) {

        if (part === leafPart) {
          branch[part].beforeRoute = beforeRoute;
          branch[part].onRoute = onRoute;
        }

        return branch[part].children;

      } else {

        return (branch[part] = {
          beforeRoute: part === leafPart ? beforeRoute : void 0,
          onRoute: part === leafPart ? onRoute : void 0,
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