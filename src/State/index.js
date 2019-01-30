

// Registered State Modules
const CUE_STATE_MODULES = new Map();

// State Flags
let isReacting = false; // is a reaction currently in process?
let isAccumulating = false; // are we accumulating observers and derivatives because a change is part of a multi-property-change action?

// Global derivative installer payload
const DERIVATIVE_INSTALLER = {
  derivative: null,
  allProperties: null,
  derivedProperties: null
};

// Traversal Directions (needed for dependency branch walking)
const TRAVERSE_DOWN = -1;
const TRAVERSE_UP = 1;

// Meta Keys used for closure scope lookup && safely extending foreign objects
const __CUE__ = Symbol('🍑');
const __TARGET__ = Symbol('Target Object');
const __INTERCEPTED_METHODS__ = Symbol('Intercepted Methods');

// Reaction Queue
const MAIN_QUEUE = [];