
function dependencyGetInterceptor(target, sourceProperty) {

  const {derivative, allProperties, derivedProperties} = DERIVATIVE_INSTALLER;

  if (!allProperties.hasOwnProperty(sourceProperty)) {
    throw new Error(`Unable to resolve dependency "${sourceProperty}" of computed prop "${derivative.ownPropertyName}".`);
  }

  // add the property as a sourceProperty to the derivative
  if (derivative.sourceProperties.indexOf(sourceProperty) === -1) {
    derivative.sourceProperties.push(sourceProperty);
  }

  // if the sourceProperty is a derivative itself
  if (derivedProperties.has(sourceProperty)) {

    const SourceDerivative = derivedProperties.get(sourceProperty);

    if (SourceDerivative.subDerivatives.indexOf(derivative) === -1) {
      SourceDerivative.subDerivatives.push(derivative);
    }

    if (derivative.superDerivatives.indexOf(SourceDerivative) === -1) {
      derivative.superDerivatives.push(SourceDerivative);
    }

  }

}