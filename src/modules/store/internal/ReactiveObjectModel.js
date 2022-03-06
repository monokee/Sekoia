import { Core } from "./Core.js";
import { ComputedProperty } from "./ComputedProperty.js";

export class ReactiveObjectModel {

  constructor(properties) {

    this.instances = 0;
    this.nativeData = {};
    this.privateKeys = new Set();
    this.boundProperties = new Map();
    this.computedProperties = new Map();

    let isPrivate;
    for (const key in properties) {

      if (properties.hasOwnProperty(key)) {

        if (key.indexOf('_') === 0) {
          this.privateKeys.add(key);
          isPrivate = true;
        } else {
          isPrivate = false;
        }

        const value = properties[key];

        if (value?._isBinding_) {
          // It is possible to attach bindings to private, readonly computed properties.
          // It is not possible to attach bindings to non-computed private properties
          // since the private key value would leak to the bindings source object.
          if (isPrivate && !value.readonly) {
            throw new Error(`Can not bind("${value.ownPropertyName}") to private key "${key}" because it is only accessible by this object.`);
          } else {
            this.boundProperties.set(key, value);
          }
        } else if (typeof value === 'function') {
          this.computedProperties.set(key, new ComputedProperty(key, isPrivate, value, [], null));
        } else {
          this.nativeData[key] = value;
        }

      }

    }

    if (this.computedProperties.size) {
      this.computedProperties = Core.setupComputedProperties(properties, this.computedProperties);
    }

  }

}