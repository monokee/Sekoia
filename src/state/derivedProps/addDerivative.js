
function addDerivative(data, model, property, derivedProperties) {

  const derivative = new Derivative(model, property, data[property]);

  derivedProperties.set(property, derivative);

  // replace the function on the data object with a getter that returns the value of the derivative
  // derivative.value is also a "getter" that automatically recomputes the value only if any of its' dependencies have changed.
  Object.defineProperty(data, property, {
    get() { return derivative.value },
    configurable: true,
    enumerable: false
  });

  return derivative;

}