
/**
 * Injects State Providers directly into child state instances with a strong pointer when the child state has write-access to the provider.
 * A Provider is a state object that borrows properties to its descendents (consumers) when they inject data from an ancestor state into themselves.
 * Whenever a property in the state tree is mutated and that property has been provided to the mutating child state object, the mutation is forwarded to the providing ancestor state object.
 * @function injectProviders
 * @param {object}  childStateInternals   - the child state (__CUE__ internals) that injects providers into itself.
 * @param {Map}     providersToInstall    - Map of ProviderDescriptions {providerModuleName, providedPropertyName}
 */
function injectProviders(childStateInternals, providersToInstall) {

  let description, sourceModule, sourceProperty, targetModule, targetProperty;
  for (description of providersToInstall.values()) {

    // only install providers onto children when they are allowed to mutate the providing parent state
    if (description.readOnly === false) {

      sourceModule = description.sourceModule;
      sourceProperty = description.sourceProperty;
      targetModule = description.targetModule;
      targetProperty = description.targetProperty;

      // Traverse through the parent hierarchy until we find the first parent that has been created from a module that matches the name of the providerModule
      let parent = childStateInternals.parent;

      while (parent && parent[__CUE__].name !== sourceModule) {
        parent = parent[__CUE__].parent;
      }

      if (parent) { // found a parent instance that matches the consuming child module name

        parent = parent[__CUE__];

        // -> inject the provider!
        childStateInternals.providersOf.set(targetProperty, {sourceInstance: parent, sourceProperty, targetModule, targetProperty});

      } else {

        // If we traversed until there are no more parents and we haven't found a state created from our providerModule, throw:
        throw new Error(`[${targetModule}]: Can't inject "${targetProperty}" from "${sourceModule}" because it's not an ancestor of the injecting module instance.`);

      }

    }

  }

  // providers installed. clear the map.
  providersToInstall.clear();

}