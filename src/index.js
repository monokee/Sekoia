import { Server } from "./modules/server.js";
import { Store } from "./modules/store.js";
import { Component } from "./modules/component.js";
import { Router } from "./modules/router.js";

//removeIf(esModule)
const Cue = {Component, Store: Store, Server, Router};
if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = Cue;
} else if (typeof define === 'function' && define.amd) {
  define('Cue', [], function() {
    return Cue;
  });
} else {
  window.Cue = Cue;
}
//endRemoveIf(esModule)
