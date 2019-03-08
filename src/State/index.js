
/**
 * Cue.State - The granular reactivity engine behind Cue.
 *
 * Has the following built-in concepts:
 * - User defined modules have declarative default properties, computed properties and actions.
 * - Modules are blueprints from which state instances can be created using factory functions.
 * - Modules are like classes but specifically optimized for reactive state modeling.
 * - Modules can import other Modules which they extend themselves with.
 * - Property change interception (willChange handlers)
 * - Change reaction handling (didChange handlers and external reactions for side-effects)
 * - Chain-able and micro-optimized computed properties
 */

// Registered State Modules: name -> lazy factory
const CUE_STATE_MODULES = new Map();

// Internals of State Modules for internally passing module data around: name -> object
const CUE_STATE_INTERNALS = new Map();

// Reaction Queue (cleared after each run)
const REACTION_QUEUE = new Map();
const DERIVATIVE_QUEUE = new Map();
const SUB_DERIVATIVE_QUEUE = new Map();

// Global derivative installer payload
const DERIVATIVE_INSTALLER = {
  derivative: null,
  allProperties: null,
  derivedProperties: null
};

// Traversal Directions (needed for dependency branch walking)
const TRAVERSE_DOWN = -1;
const TRAVERSE_UP = 1;

// State Type Constants
const STATE_TYPE_ROOT = -1;
const STATE_TYPE_MODULE = 1;
const STATE_TYPE_EXTENSION = 2;

// Data Type Constants
const DATA_TYPE_UNDEFINED = -1;
const DATA_TYPE_PRIMITIVE = 0;
const DATA_TYPE_POJO = 1;
const DATA_TYPE_ARRAY = 2;

// Root State Store
const CUE_ROOT_STATE = {};
oDefineProperty(CUE_ROOT_STATE, __CUE__, {
  value: {
    name: '::ROOT::',
    type: STATE_TYPE_ROOT,
    plainState: CUE_ROOT_STATE,
    proxyState: CUE_ROOT_STATE,
    observersOf: EMPTY_MAP,
    derivativesOf: EMPTY_MAP,
    //consumersOf: EMPTY_MAP,
    //providersToInstall: EMPTY_MAP,
    //derivativesToInstall: EMPTY_MAP,
    internalGetters: EMPTY_MAP,
    internalSetters: EMPTY_MAP,
    propertyDidChange: NOOP
  }
});