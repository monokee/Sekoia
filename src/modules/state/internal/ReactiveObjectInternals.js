import { Core } from "./Core.js";
import { Queue } from "./Queue.js";
import { Binding } from "./Binding.js";
import { deepClone } from "../../utils/deep-clone.js";

export class ReactiveObjectInternals {

  constructor(model) {

    // clone from the second instance on
    const cloneChildren = ++model.instances > 1;

    this.model = model;
    this.privateKeys = model.privateKeys;
    this.boundProperties = model.boundProperties;
    this.modelNativeData = model.nativeData;

    this.nativeData = {};
    this.allProperties = {};
    this.settableProperties = {};
    this.bindings = new Map();
    this.events = new Map();
    this.computedProperties = new Map();
    this.dependencyGraph = new Map();

    this.parentInternals = null;
    this.ownPropertyName = '';

    for (const key in this.modelNativeData) {

      if (this.modelNativeData.hasOwnProperty(key)) {

        const value = this.modelNativeData[key];

        if (value && value.$$) {

          if (cloneChildren) {
            this.nativeData[key] = value.$$.owner.clone();
          } else {
            this.nativeData[key] = value;
          }

          this.nativeData[key].$$.parentInternals = this;
          this.nativeData[key].$$.ownPropertyName = key;

        } else {

          this.nativeData[key] = deepClone(value);

        }

      }

    }

    // register internals on the binding so that when
    // nativeData changes in the implementing object, this one gets notified
    for (const [key, binding] of model.boundProperties) {
      binding.connect(this, key);
    }

    if (model.computedProperties.size) {

      // install a single data proxy into all computations.
      const proxy = new Proxy(this.allProperties, {
        get: (target, key) => this.getDatum(key, false)
      });

      for (const [key, computedProperty] of model.computedProperties) {
        this.computedProperties.set(key, computedProperty.clone(proxy));
      }

      Core.buildDependencyGraph(this.computedProperties, this.dependencyGraph);

    }

  }

  getDefaultDatum(key) {

    if (this.modelNativeData.hasOwnProperty(key)) {

      const value = this.modelNativeData[key];

      if (value?.$$) {
        return value.$$.getDefaultData();
      } else {
        return value;
      }

    } else if (this.boundProperties.has(key)) {

      return this.boundProperties.get(key).getDefaultValue();

    }

  }

  getDefaultData() {

    let key, val;

    for ([key, val] of this.boundProperties) {
      if (!val.readonly) { // skip bindings that resolve to computed properties
        this.settableProperties[key] = val.getDefaultValue();
      }
    }

    for (key in this.modelNativeData) {
      if (this.modelNativeData.hasOwnProperty(key)) {
        val = this.modelNativeData[key];
        if (val?.$$) {
          this.settableProperties[key] = val.$$.getDefaultData();
        } else {
          this.settableProperties[key] = val;
        }
      }
    }

    return this.settableProperties;

  }

  getDatum(key, writableOnly) {

    if (this.nativeData.hasOwnProperty(key)) {

      const value = this.nativeData[key];

      if (writableOnly) {
        if (value?.$$) {
          return value.$$.getData(writableOnly);
        } else if (!this.privateKeys.has(key)) {
          return value;
        }
      } else {
        return value;
      }

    } else if (this.boundProperties.has(key)) {

      return this.boundProperties.get(key).getValue(writableOnly);

    } else if (!writableOnly && this.computedProperties.has(key)) {

      return this.computedProperties.get(key).getValue();

    }

  }

  getData(writableOnly) {

    const wrapper = {};

    let key, val;

    for (key in this.nativeData) {
      if (this.nativeData.hasOwnProperty(key)) {
        val = this.nativeData[key];
        if (writableOnly) {
          if (val?.$$) {
            wrapper[key] = val.$$.getData(writableOnly);
          } else if (!this.privateKeys.has(key)) {
            wrapper[key] = val;
          }
        } else {
          wrapper[key] = val;
        }
      }
    }

    for ([key, val] of this.boundProperties) {
      if (writableOnly && !val.readonly) {
        wrapper[key] = val.getValue(writableOnly);
      }
    }

    if (!writableOnly) {
      for (const [key, val] of this.computedProperties) {
        wrapper[key] = val.getValue();
      }
    }

    return wrapper;

  }

  setDatum(key, value, silent) {

    if (this.nativeData.hasOwnProperty(key)) {

      if (this.nativeData[key]?.$$) {

        this.nativeData[key].$$.setData(value, silent);

      } else if (Core.patchData(this.nativeData[key], value, this.nativeData, key) && !silent) {

        this.resolve(key, value);

      }

    } else if (this.boundProperties.has(key)) {

      this.boundProperties.get(key).setValue(value, silent);

    }

  }

  setData(data, silent) {
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        this.setDatum(key, data[key], silent);
      }
    }
  }

  observe(key, callback, unobservable, silent) {

    if (this.boundProperties.has(key)) {

      // forward the subscription to the bound object
      return this.boundProperties.get(key).observeSource(callback, unobservable, silent);

    } else if (this.nativeData[key]?.$$) {

      // use wildcard listener on child object
      return this.nativeData[key].$$.observe('*', callback, unobservable, silent);

    } else {

      // (0) Install Observer so it can run in the future whenever observed key changes

      const callbacks = this.events.get(key);

      if (callbacks) {
        callbacks.push(callback);
      } else {
        this.events.set(key, [ callback ]);
      }

      // (1) Schedule an immediate observation
      if (!silent) {

        if (key === '*') {

          Queue.wildcardEvents.set(callback, this.owner);

        } else {

          const computedProperty = this.computedProperties.get(key);

          if (computedProperty) {
            Queue.keyEvents.set(callback, computedProperty.getValue());
          } else {
            Queue.keyEvents.set(callback, this.nativeData[key]);
          }

        }

        Queue.flush();

      }

      // (2) Return unobserve function if required
      if (unobservable) {
        return () => {
          const callbacks = this.events.get(key);
          if (callbacks && callbacks.includes(callback)) {
            callbacks.splice(callbacks.indexOf(callback), 1);
          }
        }
      }

    }

  }

  bind(key) {

    // returns a Binding that can be implemented as a property value on other objects.
    // the Binding forwards all read/write operations to this object which is the single
    // source of truth. Binding is two-way unless it is readonly (computed).

    // internal.bindings: key bindings that are bound to other objects that get/set nativeData in this object.
    // when a bound property in another object changes, the actual data changes here.
    // when the data changes here, all bound objects are notified.
    //
    // internal.boundProperties: key bindings that are bound to this object that get/set nativeData in another object.
    // when data changes here, the actual data changes in the other object.
    // when data changes in the other object, this object and it's bound cousins are notified.

    if (this.boundProperties.has(key)) {
      throw new Error(`Cannot bind("${key}") because that property is already bound itself. Instead of chaining, bind directly to the source.`);
    } else if (this.privateKeys.has(key)) {
      throw new Error(`Cannot bind("${key}") because it is private and only available to the source object internally.`);
    }

    if (!this.bindings.has(key)) {
      const readonly = this.computedProperties.has(key);
      this.bindings.set(key, new Binding(this, key, readonly));
    }

    return this.bindings.get(key);

  }

  resolve(key, value) {

    let onlyPrivateKeysChanged = this.privateKeys.has(key);

    const OWN_DEPENDENCY_GRAPH = this.dependencyGraph;
    const OWN_EVENTS = this.events;

    const QUEUE_KEY_EVENTS = Queue.keyEvents;

    // (0) ---------- RESOLVE COMPUTED DEPENDENCIES

    const KEY_DEPENDENCIES = OWN_DEPENDENCY_GRAPH.get(key);

    if (KEY_DEPENDENCIES) {

      const QUEUE_COMPUTATIONS = Queue.computedProperties;
      const QUEUE_RESOLVED = Queue.resolvedComputedProperties;
      const QUEUE_DEPENDENCIES = Queue.dependencies;

      // queue up unique computed properties that immediately depend on changed key
      for (let i = 0; i < KEY_DEPENDENCIES.length; i++) {
        QUEUE_COMPUTATIONS.add(KEY_DEPENDENCIES[i]);
      }

      while (QUEUE_COMPUTATIONS.size) {

        for (const computedProperty of QUEUE_COMPUTATIONS) {

          if (!QUEUE_RESOLVED.has(computedProperty)) {

            // force re-computation because dependency has updated
            computedProperty.needsUpdate = true;

            const result = computedProperty.getValue();

            if (computedProperty.hasChanged === true) {

              // Queue KEY events of computed property
              const keyEvents = OWN_EVENTS.get(computedProperty.ownPropertyName);
              if (keyEvents) {
                for (let i = 0; i < keyEvents.length; i++) {
                  QUEUE_KEY_EVENTS.set(keyEvents[i], result);
                }
              }

              // flag wildcards to queue if computed property is not private
              if (!computedProperty.isPrivate) {
                onlyPrivateKeysChanged = false;
              }

              // add this computed property as a DEPENDENCY
              QUEUE_DEPENDENCIES.add(computedProperty);

            }

            QUEUE_RESOLVED.add(computedProperty);

          }

          // empty initial queue
          QUEUE_COMPUTATIONS.delete(computedProperty);

        }

        // add any unresolved dependencies back into the queue
        for (const computedProperty of QUEUE_DEPENDENCIES) {

          const dependencies = OWN_DEPENDENCY_GRAPH.get(computedProperty.ownPropertyName);

          if (dependencies) {
            for (let i = 0; i < dependencies.length; i++) {
              // add this dependency back onto the queue so that
              // the outer while loop can continue to resolve
              QUEUE_COMPUTATIONS.add(dependencies[i]);
            }
          }

          // empty dependency queue
          QUEUE_DEPENDENCIES.delete(computedProperty);

        }

      }

      // Clear the resolved queue
      QUEUE_RESOLVED.clear();

    }

    // (1) ------------ QUEUE EVENTS

    // ...queue key events
    const KEY_EVENTS = OWN_EVENTS.get(key);
    if (KEY_EVENTS) {
      for (let i = 0; i < KEY_EVENTS.length; i++) {
        QUEUE_KEY_EVENTS.set(KEY_EVENTS[i], value);
      }
    }

    // when public properties where affected...
    if (!onlyPrivateKeysChanged) {

      // ...queue wildcard events
      const WILDCARD_EVENTS = OWN_EVENTS.get('*');
      if (WILDCARD_EVENTS) {
        const QUEUE_WILDCARDS = Queue.wildcardEvents;
        for (let i = 0; i < WILDCARD_EVENTS.length; i++) {
          QUEUE_WILDCARDS.set(WILDCARD_EVENTS[i], this.owner);
        }
      }

      // ...resolve connected objects
      const KEY_BINDING = this.bindings.get(key);
      if (KEY_BINDING) {
        for (const [connectedObjectInternals, boundKey] of KEY_BINDING.connectedObjectInternals) {
          connectedObjectInternals.resolve(boundKey, value);
        }
      }

      // ...resolve parent
      if (this.parentInternals) {
        this.parentInternals.resolve(this.ownPropertyName, this.owner);
      }

    }

    Queue.flush();

  }

}