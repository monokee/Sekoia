const REQUEST = window.requestAnimationFrame;

export const Queue = {

  tick: 0,
  keyEvents: new Map(),
  wildcardEvents: new Map(),
  computedProperties: new Set(),
  dependencies: new Set(),
  resolvedComputedProperties: new Set(),

  flush() {
    if (!this.__scheduled) {
      this.__scheduled = REQUEST(this.__flushOnNextTick);
    }
  },

  throttle(fn, interval) {
    // creates a function throttled to internal flush tick
    let last = -9999999;
    return arg => {
      const now = this.tick;
      if (now - last > interval) {
        last = now;
        return fn(arg);
      }
    }
  },

  // -----------------------------------

  __scheduled: 0,
  __keyEvents: new Map(),
  __wildcardEvents: new Map(),

  __flushOnNextTick(tick) {

    this.tick = tick;

    const keyEvents = this.keyEvents;

    if (keyEvents.size) {

      // swap public buffer so events can re-populate
      // it in recursive write operations
      this.keyEvents = this.__keyEvents;
      this.__keyEvents = keyEvents;

      for (const [callback, value] of keyEvents) {
        callback(value);
        keyEvents.delete(callback);
      }

    }

    const wildcardEvents = this.wildcardEvents;

    if (wildcardEvents.size) {

      this.wildcardEvents = this.__wildcardEvents;
      this.__wildcardEvents = wildcardEvents;

      for (const [callback, owner] of wildcardEvents) {
        callback(owner);
        wildcardEvents.delete(callback);
      }

    }

    // events can re-populate these buffers because they are
    // allowed to change state in reaction to another state change.
    if (this.keyEvents.size || this.wildcardEvents.size) {
      this.__flushOnNextTick(tick); // pass same rAF tick
    } else {
      this.__scheduled = 0;
    }

  }

};

Queue.__flushOnNextTick = Queue.__flushOnNextTick.bind(Queue);