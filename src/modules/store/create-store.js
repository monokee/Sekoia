import { ReactiveArray } from "./ReactiveArray.js";
import { ReactiveObject } from "./ReactiveObject.js";

export function createStore(objectOrArray, options) {
  if (Array.isArray(objectOrArray)) {
    return new ReactiveArray(objectOrArray, options);
  } else {
    return new ReactiveObject(objectOrArray);
  }
}