
/**
 * Installs a weak link to a consuming child module on a parent module that will provide data to it.
 * @param targetModule    {string}          - The name of the module that is consuming data from a provider.
 * @param targetProperty  {(string|number)} - The name of the property on the targetModule that is consuming the sourceProperty on the sourceModule.
 * @param sourceModule    {string}          - The name of the module that is providing data to the targetModule.
 * @param sourceProperty  {(string|number)} - The name of the property on the sourceModule that is providing data to the targetProperty on the targetModule.
 */
function referenceConsumer(targetModule, targetProperty, sourceModule, sourceProperty) {

  const ConsumerReference = {targetModule, targetProperty};

  // This is guaranteed to be available because it has to be a parent (ie something that had to be there before the child) to be a provider!
  const source = CUE_STATE_INTERNALS.get(sourceModule);

  if (source.consumersOf.has(sourceProperty)) {
    source.consumersOf.get(sourceProperty).push(ConsumerReference);
  } else {
    source.consumersOf.set(sourceProperty, [ ConsumerReference ]);
  }

}