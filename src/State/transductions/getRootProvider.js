
/**
 * Find the first state instance that has only consumers but no further providers of a provided property.
 * @param {object} provider - The provider of a property value. If the value has been provided to the provider, recurse until provider has no more providers.
 * @return {object}         - The root provider of the initially passed provider. Might be the initially passed provider if it doesn't have superProviders.
 */
function getRootProvider(provider) {
  const superProvider = provider.sourceInstance.providersOf.get(provider.sourceProperty);
  return superProvider ? getRootProvider(superProvider) : provider;
}