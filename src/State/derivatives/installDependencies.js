
/**
 * Creates a dependency graph on the vDerivatives stored on a state module.
 * vDerivatives are used at runtime to quickly create instances of Derivatives.
 * Here we create a proxy object around the original config.props (allProperties) and call
 * the computations of the computed properties in the context of this proxy. The proxy will
 * intercept any "get" requests that the computations perform and thus figures out which properties
 * the computation depends on. As a convention it is encouraged that computations should destructure their dependencies from their first
 * function argument instead of dotting into "this" to ensure all dependencies are reached even when they are requested from within conditionals.
 * @function installDependencies
 * @param {Object}  allProperties       - config.props object containing both normal and computed properties.
 * @param {Map}     computedProperties  - Map of computed Properties -> vDerivatives.
 * */
function installDependencies(allProperties, computedProperties) {

  // set the current installer payload
  oAssign(DERIVATIVE_INSTALLER, {
    allProperties: allProperties,
    computedProperties: computedProperties
  });

  // intercept get requests to props object to grab sourceProperties
  const installer = new Proxy(allProperties, {
    get: dependencyGetInterceptor 
  });

  // call each computation which will trigger the intercepted get requests
  let derivative;
  for (derivative of computedProperties.values()) {

    DERIVATIVE_INSTALLER.derivative = derivative;

    try {
      // the computation itself will most definitely fail but we only care about the property dependencies so we can safely ignore all errors.
      derivative.computation.call(installer, installer);
    } catch(e) {}

  }

  // kill pointers
  DERIVATIVE_INSTALLER.derivative = null;
  DERIVATIVE_INSTALLER.allProperties = null;
  DERIVATIVE_INSTALLER.computedProperties = null;

}