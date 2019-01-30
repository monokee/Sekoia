
function installDependencies(props, { computed }) {

  // set the current installer payload
  oAssign(DERIVATIVE_INSTALLER, {
    allProperties: props,
    derivedProperties: computed
  });

  // intercept get requests to props object to grab sourceProperties
  const installer = new Proxy(props, { 
    get: dependencyGetInterceptor 
  });

  // call each computation which will trigger the intercepted get requests
  computed.forEach(derivative => {

    DERIVATIVE_INSTALLER.derivative = derivative;

    try {
      // the computation itself will most definitely fail but we only care about the property dependencies so we can safely ignore all errors.
      // #DOC: As a convention, computations should destructure dependencies from first argument instead of dotting into "this" to ensure all dependencies are reached even if computation body contains conditionals.
      derivative.computation.call(installer, installer);
    } catch(e) {}

  });

  // kill pointers
  DERIVATIVE_INSTALLER.derivative = null;
  DERIVATIVE_INSTALLER.allProperties = null;
  DERIVATIVE_INSTALLER.derivedProperties = null;

}