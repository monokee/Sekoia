
// Cue Scoped Utils and Helpers (available anywhere in the library)

// NoOp method
const NOOP = ()=>{};

// All mutating array methods
const ARRAY_MUTATORS = new Set(['copyWithin','fill','pop','push','reverse','shift','sort','splice','unshift']);

// Static Object/Array Helpers
const oAssign = Object.assign;
const oCreate = Object.create;
const oDefineProperty = Object.defineProperty;
const oDefineProperties = Object.defineProperties;
const oSetPrototypeOf = Object.setPrototypeOf;
const oKeys = Object.keys;
const isArray = Array.isArray;

// Static Math Helpers
const MAX = Math.max;
const MIN = Math.min;
const RANDOM = Math.random;
const ABS = Math.abs;
const POW = Math.pow;
const ROUND = Math.round;
const FLOOR = Math.floor;
const CEIL = Math.ceil;
const PI = Math.PI;
const DEG2RAD = PI / 180;
const RAD2DEG = 180 / PI;

// Reflect methods
const _set = Reflect.set;
const _get = Reflect.get;
const _apply = Reflect.apply;
const _delete = Reflect.deleteProperty;