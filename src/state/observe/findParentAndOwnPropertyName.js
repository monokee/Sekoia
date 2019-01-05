
function findParentAndOwnPropertyName(target, scope) {

  // TODO: currently huge overhead when instantiating models because we're brute-force searching from the root each time a model is created as part of a list (objects in an array etc).
  // TODO: we can optimize this search dramatically by pre-determining expected parents of state modules via their registration name and only fallback to brute-force search from the root store when the initial assumption fails

  if (isArray(scope)) {
    for (let i = 0, v, result; i < scope.length; i++) {
      if ((v = scope[i])) {
        if (v === target || v[_SOURCE_DATA_] === target) {
          return {parent: scope, ownPropertyName: i};
        } else if (typeof v === 'object' && (result = findParentAndOwnPropertyName(target, v))) {
          return result;
        }
      }
    }
  } else {
    let prop, v, result;
    for (prop in scope) {
      if ((v = scope[prop])) {
        if (v === target || v[_SOURCE_DATA_] === target) {
          return {parent: scope, ownPropertyName: prop};
        } else if (typeof v === 'object' && (result = findParentAndOwnPropertyName(target, v))) {
          return result;
        }
      }
    }
  }

}