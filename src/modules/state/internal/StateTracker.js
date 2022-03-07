import { deepEqual } from "../../utils/deep-equal.js";

export class StateTracker {

  constructor(onTrack, maxEntries = 100) {
    this.__stack = [];
    this.__index = 0;
    this.__recursive = false;
    this.__max = maxEntries;
    this.__onTrack = onTrack;
  }

  prev() {
    return this.__index - 1;
  }

  next() {
    return this.__index + 1;
  }

  has(index) {
    if (index < 0 || !this.__stack.length) {
      return false;
    } else {
      return index <= this.__stack.length - 1;
    }
  }

  get(index) {

    if (index !== this.__index) {

      this.__recursive = true;
      this.__index = index;

      if (this.__onTrack) {
        // callback value, index, length
        this.__onTrack(this.__stack[index], index, this.__stack.length);
      }

    }

    return this.__stack[index];

  }

  add(state, checkUniqueness) {

    if (this.__recursive) {

      this.__recursive = false;

    } else {

      state = state?.$$ ? state.snapshot() : state;

      if (checkUniqueness && deepEqual(state, this.__stack[this.__index])) {

        return false;

      } else {

        // history modification: remove everything after this point
        if (this.__index + 1 < this.__stack.length) {
          this.__stack.splice(this.__index + 1, this.__stack.length - this.__index - 1);
        }

        // maxed out: remove items from beginning
        if (this.__stack.length === this.__max) {
          this.__stack.shift();
        }

        // append and move marker to last position
        this.__stack.push(state);
        this.__index = this.__stack.length - 1;

        if (this.__onTrack) {
          this.__onTrack(this.__stack[this.__index], this.__index, this.__stack.length);
        }

        return true;

      }

    }

  }

}