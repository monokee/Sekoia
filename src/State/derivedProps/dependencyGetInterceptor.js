
/**
 * Used as Proxy "get" handler during dependency installation for computed properties (Derivatives)
 * @function dependencyGetInterceptor
 * @param {object} target - The Installer Object (proxy)
 * @param {string} sourceProperty - The property name that is being intercepted.
 * @external {object} DERIVATIVE_INSTALLER - Derivative installer payload object that is reused throughout the library.
 */
function dependencyGetInterceptor(target, sourceProperty) {

  /**
   * @external {object} DERIVATIVE_INSTALLER
   * @property {object} derivative - The currently installing derivative
   * @property {object} allProperties - config.props object containing both normal properties AND computed properties.
   * @property {object} computedProperties - module.computed properties. Map of vDerivatives
   */
  const {derivative, allProperties, computedProperties} = DERIVATIVE_INSTALLER;

  if (!allProperties.hasOwnProperty(sourceProperty)) {
    throw new Error(`Unable to resolve dependency "${sourceProperty}" of computed prop "${derivative.ownPropertyName}".`);
  }

  // add the property as a sourceProperty to the derivative
  if (derivative.sourceProperties.indexOf(sourceProperty) === -1) {
    derivative.sourceProperties.push(sourceProperty);
  }

  // if the sourceProperty is a derivative itself
  if (computedProperties.has(sourceProperty)) {

    const SourceDerivative = computedProperties.get(sourceProperty);

    if (SourceDerivative.subDerivatives.indexOf(derivative) === -1) {
      SourceDerivative.subDerivatives.push(derivative);
    }

    if (derivative.superDerivatives.indexOf(SourceDerivative) === -1) {
      derivative.superDerivatives.push(SourceDerivative);
    }

  }

}