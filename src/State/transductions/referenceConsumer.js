
/**
 * Installs a weak link to a consuming child module on a parent module that will provide data to it.
 * @param targetModule    {string}          - The name of the module that is consuming data from a provider.
 * @param targetProperty  {(string|number)} - The name of the property on the targetModule that is consuming the sourceProperty on the sourceModule.
 * @param sourceModule    {string}          - The name of the module that is providing data to the targetModule.
 * @param sourceProperty  {(string|number)} - The name of the property on the sourceModule that is providing data to the targetProperty on the targetModule.
 */
/*
function referenceConsumer(targetModule, targetProperty, sourceModule, sourceProperty) {

  const ConsumerReference = {targetModule, targetProperty, sourceModule, sourceProperty};

  const source = CUE_STATE_INTERNALS.get(sourceModule);

  if (source.consumersOf.has(sourceProperty)) {

    const consumers = source.consumersOf.get(sourceProperty);

    let exists = false, i = -1;
    while (++i < consumers.length && exists === false) {
      if (
        consumers[i].targetModule === targetModule
        && consumers[i].targetProperty === targetProperty
        && consumers[i].sourceModule === sourceModule
        && consumers[i].sourceProperty === sourceProperty
      ) exists = true;
    }

    if (exists === false) {
      source.consumersOf.get(sourceProperty).push(ConsumerReference);
    }

  } else {

    source.consumersOf.set(sourceProperty, [ ConsumerReference ]);

  }

}
*/