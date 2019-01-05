
// TODO: Deprecate
function setupDerivatives(data, model, derivedProperties) {

  const props = Object.keys(data);
  const total = props.length;

  let i, k, prop;

  // 1: Create Derivatives + Modify Data
  for (i = 0; i < props.length; i++) {
    // for each (own) function in the data object
    prop = props[i];
    if (data.hasOwnProperty(prop) && typeof data[prop] === 'function') {
      addDerivative(data, model, prop, derivedProperties);
    }
  }

  if (derivedProperties.size === 0) {
    return false;
  }

  // 2: Connect Derivatives.
  // handshake method that sets up the derivative as a derivative of it's
  // model sources and the sources as dependencies on the derivative.
  derivedProperties.forEach(derivative => derivative.connect());

  // Next we have to traverse the model and fill the cache of each derivative.
  // Because derivatives can depend on other derivatives, we need this
  // basic tree traversal algorithm that only computes a derived property
  // when all of it's dependencies are marked ready.

  let sourceProp, derivative, sourceDerivative;
  const ready = [];

  // 3: Traverse
  search : while (ready.length < total) { // search entire stack until all derivatives are ready

    for (i = 0; i < total; i++) { // for each property

      prop = props[i];
      derivative = derivedProperties.get(prop);

      if (derivative && derivative.readyToInstall === false) { // if property is a pending derivative

        for (k = 0; k < derivative.dependencies.length; k++) { // for each of its source dependencies

          sourceProp = derivative.dependencies[k];
          sourceDerivative = derivedProperties.get(sourceProp);

          if (sourceDerivative && sourceDerivative.readyToInstall === false) {
            derivative.readyToInstall = false;
            break;
          } else {
            derivative.readyToInstall = true;
          }

        }

        if (derivative.readyToInstall) {

          // all dependencies of the derivative are now available.
          // copy source data values into the derivatives' internal cache:
          derivative.refreshCache(data);
          ready.push(prop);

        }

      } else if (ready.indexOf(prop) === -1) {

        ready.push(prop);

      }

      if (ready.length === total) {
        break search;
      }

    }

  }

  return true;

}