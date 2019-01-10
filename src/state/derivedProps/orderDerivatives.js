
const OrderedDerivatives = {

  // topological sorter to resolve derivative dependencies
  // returns sorted map

  source: null,
  visited: [],

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