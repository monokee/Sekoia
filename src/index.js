// Component
import { createElement } from "./modules/component/create-element.js";
import { defineComponent } from "./modules/component/define-component.js";
import { onResize } from "./modules/component/on-resize.js";
import { renderList } from "./modules/component/render-list.js";

// Router
import { Router } from "./modules/router/router.js";

// Server
import { deleteRequest } from "./modules/server/delete-request.js";
import { getRequest } from "./modules/server/get-request.js";
import { onRequestStart, onRequestStop } from "./modules/server/on-request.js";
import { postRequest } from "./modules/server/post-request.js";
import { putRequest } from "./modules/server/put-request.js";

// Store
import { createState } from "./modules/state/create-state.js";
import { PersistentStorage } from "./modules/state/PersistentStorage.js";
import { ReactiveArray } from "./modules/state/ReactiveArray.js";
import { ReactiveObject } from "./modules/state/ReactiveObject.js";

// Utils
import { deepClone } from "./modules/utils/deep-clone.js";
import { deepEqual } from "./modules/utils/deep-equal.js";
import { hashString } from "./modules/utils/hash-string.js";
import { throttle } from "./modules/utils/throttle.js";
import { defer } from "./modules/utils/defer.js";

//removeIf(esModule)
const Sekoia = {
  createElement,
  defineComponent,
  onResize,
  renderList,
  Router,
  deleteRequest,
  getRequest,
  onRequestStart,
  onRequestStop,
  postRequest,
  putRequest,
  createState,
  PersistentStorage,
  ReactiveArray,
  ReactiveObject,
  deepClone,
  deepEqual,
  hashString,
  throttle,
  defer
};

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = Sekoia;
} else if (typeof define === 'function' && define.amd) {
  define('Sekoia', [], function() {
    return Sekoia;
  });
} else {
  window.Sekoia = Sekoia;
}
//endRemoveIf(esModule)
