
/*
 *
 * 🍑 Cue.js - Data Driven UI
 *
 * @author Jonathan M. Ochmann for color.io
 * Copyright 2019 Patchflyer GmbH
 *
 */

const _CUE_VERSION_ = 0.9;

// Cue Scoped Utils and Helpers (available anywhere in the library)
const NOOP = ()=>{};

// All mutating array methods
const ARRAY_MUTATORS = new Set(['copyWithin','fill','pop','push','reverse','shift','sort','splice','unshift']);

// Builtins
const OBJ = Object;
const ARR = Array;
const MTH = Math;

// Static Object/Array Helpers
const oAssign = OBJ.assign;
const oCreate = OBJ.create;
const oDefineProperty = OBJ.defineProperty;
const oDefineProperties = OBJ.defineProperties;
const oSetPrototypeOf = OBJ.setPrototypeOf;
const oKeys = OBJ.keys;
const oEntries = OBJ.entries;
const oFreeze = OBJ.freeze;
const isArray = ARR.isArray;

// Static Math Helpers
const MAX = MTH.max;
const MIN = MTH.min;
const RANDOM = MTH.random;
const ABS = MTH.abs;
const POW = MTH.pow;
const ROUND = MTH.round;
const FLOOR = MTH.floor;
const CEIL = MTH.ceil;
const PI = MTH.PI;
const DEG2RAD = PI / 180;
const RAD2DEG = 180 / PI;

// Reflect methods
const _set = Reflect.set;
const _get = Reflect.get;
const _apply = Reflect.apply;
const _delete = Reflect.deleteProperty;

// Generic Cue Prototype Object.
// Extension point for Plugins and Module specific prototypes.
const CUE_PROTO = {};
