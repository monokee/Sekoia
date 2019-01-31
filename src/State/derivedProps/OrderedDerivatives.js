
/**
 * Topological sorter to resolve dependencies of derivatives
 * @namespace OrderedDerivatives
 * @property {(null|Map)} source - Placeholder for the Map of vDerivatives to be sorted. Nullified after each job.
 * @property {Array} visited - Placeholder for visited properties. Helper for topological sorter. Emptied after each job.
 */
const OrderedDerivatives = {

  source: null,
  visited: [],

  /**
   * Public method which resolves dependency order of computed properties.
   * @param   {Map}   derivatives - unordered vDerivatives
   * @returns {Map}   target      - vDerivatives in resolved dependency order
   */
  from(derivatives) {

    this.source = derivatives;

    const target = new Map();

    for (const sourceProperty of derivatives.keys()) {
      this._visit(sourceProperty, [], target);
    }

    this.source = null;
    this.visited.splice(0, this.visited.length);

    return target;

  },

  /**
   * Private Method used for topological sorting.
   * Detects circular dependencies and throws.
   * @param {string} sourceProperty - The property name of the derivative on its source object.
   * @param {Array}  dependencies   - An array we're passing around to collect the property names that the derivative depends on.
   * @param {Map}    target         - The ordered Map to which a derivative is added after all of its dependencies are resolved.
   */
  _visit(sourceProperty, dependencies, target) {

    if (this.source.has(sourceProperty)) {

      dependencies.push(sourceProperty);
      this.visited.push(sourceProperty);

      const derivative = this.source.get(sourceProperty);

      for (let i = 0, name; i < derivative.sourceProperties.length; i++) {

        name = derivative.sourceProperties[i];

        if (dependencies.indexOf(name) !== -1) {
          throw new Error(`Circular dependency. "${derivative.ownPropertyName}" is required by "${name}": ${dependencies.join(' -> ')}`);
        }

        if (this.visited.indexOf(name) === -1) {
          this._visit(name, dependencies, target);
        }

      }

      if (!target.has(sourceProperty)) {
        target.set(sourceProperty, derivative);
      }

    }

  }

};