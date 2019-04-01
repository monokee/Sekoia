
/**
 * This is a blueprint that is created during module registration. It will be used at instantiation time
 * to create a real Provider interfaces for the actual instances. ProviderDescription is a class so we can easily use instanceof.
 * Creates an object that describes a property transduction that we store on modules that have injected properties. It is the return value of Module.inject().
 * @param {string}  sourceModule    - The name of the module that provides a piece of data
 * @param {string}  sourceProperty  - The name of the provided property as defined on the provider module
 * @param {boolean} readOnly        - Whether the consumers of the provider have read-write or read-only capabilities
 */
/*
class ProviderDescription {

  constructor(sourceModule, sourceProperty, readOnly) {

    this.sourceModule = sourceModule;
    this.sourceProperty = sourceProperty;
    this.readOnly = readOnly === true;

    // will be added after construction, just here for clarity.
    this.targetModule = undefined;
    this.targetProperty = undefined;

  }

}
*/