

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
// TODO: deprecate many
const __CUE__ = Symbol('🍑');
const _UID_ = Symbol('UniqueID');
const _IS_OBSERVABLE_ = Symbol('IsValueObservable');
const _IS_DERIVATIVE_ = Symbol('IsValueDerived');
const _IS_REACTOR_TARGET_ = Symbol('ReactorTarget');
const _DISPOSE_REACTOR_ = Symbol('DisposeReactor');

const _REACTORS_ = Symbol('Reactors');
const _OBSERVERS_OF_ = Symbol('ObserversOfProperties');
const _DERIVATIVES_OF_ = Symbol('DerivativesOfProperties');
const _DERIVED_PROPERTIES_ = Symbol('DerivedProperties');

const _PARENT_ = Symbol('ParentModel');
const _OWNPROPERTYNAME_ = Symbol('OwnPropertyName');
const _SET_PARENT_ = Symbol('SetParent');
const _GET_OWN_CUER_ = Symbol('GetOwnCue');
const _SET_PARENT_CUER_ = Symbol('SetParentCue');
const _SOURCE_DATA_ = Symbol('SourceData');
const _PROXY_MODEL_ = Symbol('ProxyModel');

// Root Store
// TODO: possibly deprecate
const STORE = { ROOT: undefined };

// Reaction Queue
const MAIN_QUEUE = [];