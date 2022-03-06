import { deepClone } from "../../utils/deep-clone.js";

export const Core = {

  patchData(source, target, parent, key) {
    this.__systemDataDidChange = false;
    this.__deepApplyStrict(source, target, parent, key);
    return this.__systemDataDidChange;
  },

  setupComputedProperties(allProperties, computedProperties) {
    return this.__resolveDependencies(this.__installDependencies(allProperties, computedProperties));
  },

  buildDependencyGraph(computedProperties, targetMap) {

    for (const computedProperty of computedProperties.values()) {

      for(let i = 0, sourceProperty; i < computedProperty.sourceProperties.length; i++) {

        sourceProperty = computedProperty.sourceProperties[i];

        if (targetMap.has(sourceProperty)) {
          targetMap.get(sourceProperty).push(computedProperty);
        } else {
          targetMap.set(sourceProperty, [ computedProperty ]);
        }

      }

    }

    return targetMap;

  },

  // ---------------------------------------------

  __systemDataDidChange: false,
  __resolverSource: null,
  __resolverVisited: [],
  __currentlyInstallingProperties: null,
  __currentlyInstallingProperty: null,
  __dependencyProxyHandler: {

    get(target, sourceProperty) {

      const computedProperty = Core.__currentlyInstallingProperty;

      if (!target.hasOwnProperty(sourceProperty)) {
        throw {
          type: 'cue-internal',
          message: `Cannot resolve computed property "${computedProperty.ownPropertyName}" because dependency "${sourceProperty}" doesn't exist.`
        }
      }

      if (!computedProperty.sourceProperties.includes(sourceProperty)) {
        computedProperty.sourceProperties.push(sourceProperty);
      }

    }

  },

  __deepApplyStrict(source, target, parent, key) {

    // Assigns target data to parent[key] if target matches the type (in case of primitives) or shape (in case of objects) of source.
    // The algorithm works with arbitrarily nested data structures consisting of { plain: objects } and [ plain, arrays ].

    // Equality rules:
    // When source and target are both primitives, their type must match but their value must be different in order to be assigned.
    // When source and target are objects, the algorithm recursively applies the target object's properties to the source object's properties.
    // The target object must deeply match the source object's shape. This means that the property keys must match and the property values
    // must match type. In other words, target objects are not allowed to add or remove properties from source object (when both are plain objects)
    // and the property values of target must recursively match the shape or type of the source object's property values.
    // Any target property value that does not match it's corresponding source property value does not get assigned.
    // Mismatches do not throw errors - the algorithm will default to the source property value and continue to attempt to
    // assign any remaining target property values that match. When an actual assignment happens, the boolean returned by the
    // wrapping patchData() function is set to true and can be used by other parts of the system to determine if internal state has changed.
    // Arrays are treated similar to plain objects with an important distinction:
    // Arrays are allowed to change length. When source is an empty array, we push any items from the target array
    // into source because we have no way to compare existing items. When source is an array that has items and target is an array
    // that has more items than source, any added items must match the shape or type of the last item in the source array.
    // When the target array is shorter than or equal in length to the source array, we deepApply() each item recursively.

    // Implementation details:
    // This patching algorithm is wrapped by patchData function for change detection and has been implemented with
    // fast-path optimizations that short-circuit patch operations that are guaranteed to not change state.

    if (source === target) {
      return;
    }

    const typeSource = typeof source;
    const typeTarget = typeof target;

    // both are objects
    if (source && target && typeSource === 'object' && typeTarget === 'object') {

      if (source.constructor !== target.constructor) {
        return;
      }

      if (Array.isArray(source)) {

        if (!Array.isArray(target)) {

          return;

        } else {

          const sourceLength = source.length;

          if (sourceLength === 0) {

            if (target.length === 0) {

              return;

            } else {

              for (let i = 0; i < target.length; i++) {
                // we're pushing a value that might not be primitive
                // so we deepClone to ensure internal store data integrity.
                source.push(deepClone(target[i]));
              }

              this.__systemDataDidChange = true;

              return;

            }

          } else {

            if (target.length <= sourceLength) {

              source.length = target.length;

              for (let i = 0; i < source.length; i++) {
                this.__deepApplyStrict(source[i], target[i], source, i);
              }

            } else {

              // new array might get bigger
              // added items must match the shape and type of last item in array
              const lastSourceIndex = sourceLength - 1;
              const lastSourceItem = source[lastSourceIndex];

              for (let i = 0; i < target.length; i++) {
                if (i <= lastSourceIndex) {
                  this.__deepApplyStrict(source[i], target[i], source, i);
                } else if (this.__matches(lastSourceItem, target[i])) {
                  // we're pushing a value that might not be primitive
                  // so we deepClone to ensure internal store data integrity.
                  source.push(deepClone(target[i]));
                }
              }

            }

            if (sourceLength !== source.length) {
              this.__systemDataDidChange = true;
            }

            return;

          }

        }

      }

      // must be object
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          this.__deepApplyStrict(source[key], target[key], source, key);
        }
      }

      return;

    }

    // both are primitive but type doesn't match
    if (typeTarget !== typeSource) {
      return;
    }

    // both are primitive and of same type.
    // assign the primitive to the parent
    parent[key] = target;

    this.__systemDataDidChange = true;

  },

  __matches(source, target) {

    // This function checks whether two values match type (in case of primitives)
    // or shape (in case of objects). It uses the equality rules defined by
    // deepApplyStrict() and implements the same fast path optimizations.

    if (source === target) {
      return true;
    }

    const typeSource = typeof source;
    const typeTarget = typeof target;

    if (source && target && typeSource === 'object' && typeTarget === 'object') {

      if (source.constructor !== target.constructor) {
        return false;
      }

      if (Array.isArray(source)) {

        if (!Array.isArray(target)) {

          return false;

        } else {

          const sourceLength = source.length;

          if (sourceLength === 0) {

            return true; // both are arrays, source is empty -> match

          } else {

            if (target.length <= sourceLength) {

              // same length or shorter -> compare items directly
              for (let i = 0; i < target.length; i++) {
                if (!this.__matches(source[i], target[i])) {
                  return false;
                }
              }

            } else {

              // target is longer. added elements must match last source element
              const lastSourceIndex = sourceLength - 1;
              const lastSourceItem = source[lastSourceIndex];

              for (let i = lastSourceIndex; i < target.length; i++) {
                if (!this.__matches(lastSourceItem, target[i])) {
                  return false;
                }
              }

            }

            return true;

          }

        }

      }

      // both are objects, compare items directly
      for (const key in source) {
        if (source.hasOwnProperty(key) && !this.__matches(source[key], target[key])) {
          return false;
        }
      }

      return true;

    }

    return typeTarget === typeSource;

  },

  __installDependencies(allProperties, computedProperties) {

    // set the current installer payload
    this.__currentlyInstallingProperties = computedProperties;

    // intercept get requests to props object to grab sourceProperties
    const installer = new Proxy(allProperties, this.__dependencyProxyHandler);

    // call each computation which will trigger the intercepted get requests
    for (const computedProperty of computedProperties.values()) {

      this.__currentlyInstallingProperty = computedProperty;

      try {
        // the computation itself will most definitely fail but we only care about the property dependencies so we can safely ignore all errors.
        computedProperty.computation(installer);
      } catch(e) {
        if (e.type && e.type === 'cue-internal') {
          throw new Error(e.message);
        }
      }

    }

    // kill pointers
    this.__currentlyInstallingProperty = null;
    this.__currentlyInstallingProperties = null;

    return computedProperties;

  },

  __resolveDependencies(computedProperties) {

    this.__resolverSource = computedProperties;

    const target = new Map();

    for (const sourceProperty of computedProperties.keys()) {
      this.__visitDependency(sourceProperty, [], target);
    }

    this.__resolverSource = null;
    while (this.__resolverVisited.length) {
      this.__resolverVisited.pop();
    }

    return target;

  },

  __visitDependency(sourceProperty, dependencies, target) {

    if (this.__resolverSource.has(sourceProperty)) {

      dependencies.push(sourceProperty);
      this.__resolverVisited.push(sourceProperty);

      const computedProperty = this.__resolverSource.get(sourceProperty);

      for (let i = 0, name; i < computedProperty.sourceProperties.length; i++) {

        name = computedProperty.sourceProperties[i];

        if (dependencies.includes(name)) {
          throw new Error(`Circular dependency. "${computedProperty.ownPropertyName}" is required by "${name}": ${dependencies.join(' -> ')}`);
        }

        if (!this.__resolverVisited.includes(name)) {
          this.__visitDependency(name, dependencies, target);
        }

      }

      if (!target.has(sourceProperty)) {
        target.set(sourceProperty, computedProperty);
      }

    }

  }

};