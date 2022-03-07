import { deepEqual } from "../../utils/deep-equal.js";

export class ComputedProperty {

  constructor(ownPropertyName, isPrivate, computation, sourceProperties, sourceProxy) {

    this.ownPropertyName = ownPropertyName;
    this.isPrivate = isPrivate;
    this.computation = computation; // the function that computes a result from data points on the source
    
    // Dependency Graph
    this.sourceProperties = sourceProperties; // property names this computedProperty depends on
    this.sourceProxy = sourceProxy; // proxy object

    // Value Cache
    this.intermediate = void 0; // intermediate computation result
    this.value = void 0; // current computation result

    // Optimization flags
    this.needsUpdate = true; // flag indicating that one or many dependencies have updated and value needs to re-compute
    this.hasChanged = false; // flag indicating that the computation has yielded a new result (used by event-queue)

  }

  clone(sourceProxy) {
    return new this.constructor(this.ownPropertyName, this.isPrivate, this.computation, this.sourceProperties, sourceProxy);
  }

  getValue() {

    if (this.needsUpdate) { // re-compute because dependencies have updated

      // call computation with first argument = source data proxy, second argument = current value
      this.intermediate = this.computation(this.sourceProxy, this.value);

      if (!deepEqual(this.intermediate, this.value)) {

        // Computations should never produce side-effects (non-enforced convention)
        // so we don't have to do defensive cloning here. Just swap the pointer or primitive.
        this.value = this.intermediate;

        this.hasChanged = true;

      } else {

        this.hasChanged = false;

      }

      this.needsUpdate = false;

    }

    return this.value;

  }

}