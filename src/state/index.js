

// Registered State Modules
const CUE_STATE_MODULES = new Map();

// #State Variables
let isReacting = false; // is a reaction currently in process?
let isAccumulating = false; // are we accumulating observers and derivatives because a change is part of a multi-property-change action?
let derivativeToConnect = null; // Installer payload for derivatives

// Traversal Directions
const TRAVERSE_DOWN = -1;
const TRAVERSE_UP = 1;

// Meta Keys used for closure scope lookup && safely extending foreign objects
const __CUE__ = Symbol('🍑');
const __TARGET__ = Symbol('Target Object');
const __INTERCEPTED_METHODS__ = Symbol('Intercepted Methods');
const _IS_DERIVATIVE_ = Symbol('IsValueDerived');

// Root Store
const STORE = { ROOT: undefined };

// Reaction Queue
const MAIN_QUEUE = [];