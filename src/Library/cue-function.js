
Cue.Plugin('cue-fn', Library => {

  return Library.core.Function = {

    throttle(func, rate = 250, scope = null) {

      // returns a function that will only be called every "rate" milliseconds

      let now = 0.00, last = 0.00;

      return function(...rest) {
        now = Date.now();
        if (now > last + rate) {
          func.apply(scope, rest);
          last = now;
        }
      };

    },

    defer(func, delay = 250, scope = null) {

      // returns a function that is only called "delay" milliseconds after its last invocation

      let pending = null;

      return function(...rest) {
        clearTimeout(pending);
        pending = setTimeout(() => {
          func.apply(scope, rest);
          pending = null;
        }, delay);
      };

    },

    createTaskWorker(handler) {

      // Run processes in a different thread. Use postMessage interface in handler to call back to main thread.
      // handler = function || object: {process: worker.onmessage fn, response: how the workers response is handled on the main thread, onError: ...}
      //
      // Example:
      // const worker = createTaskWorker({
      //   process: function({data}) { <- useful convention to destructure the event object as we're mainly interested in the data
      //     this computation runs in worker thread. can work with data provided by main thread.
      //     postMessage(data.toString()); <- this is passed to the response handler on the main thread via event.data
      //   },
      //   response: function({data}) {
      //     runs on main thread in response to postMessage call from worker thread.
      //     console.log(typeof data);
      //   }
      // });
      //
      // Start the worker:
      // worker.process(1.234); // -> logs 'string'

      const process = typeof handler === 'function' ? handler : handler.process ? handler.process : undefined;

      const worker = new Worker(window.URL.createObjectURL(new Blob([
        `(function() { onmessage = ${process.toString()} })()`
      ],{type: 'application/javascript'})));

      if (handler.response) worker.onmessage = handler.response;
      if (handler.onError) worker.onerror = handler.onError;

      return {
        process: worker.postMessage.bind(worker), // starts the worker process
        terminate: worker.terminate.bind(worker), // terminates the worker
        set response(fn) { // defines main-thread response handler for worker
          worker.onmessage = fn;
        },
        get response() {
          return worker.onmessage;
        },
        set onError(fn) { // defines main-thread error handler for worker
          worker.onerror = fn;
        },
        get onError() {
          return worker.onerror;
        }
      };

    }

  };

}, true);