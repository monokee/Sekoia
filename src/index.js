
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
const OBJ_ID = '[object Object]';

// Static Object/Array Helpers
const oAssign = OBJ.assign;
const oCreate = OBJ.create;
const oDefineProperty = OBJ.defineProperty;
const oGetPrototypeOf = OBJ.getPrototypeOf;
const oProtoToString = OBJ.prototype.toString;

// Reflect methods
const _apply = Reflect.apply;

// Utility methods
const oKeys = OBJ.keys;
const isArray = ARR.isArray;
const toArray = ARR.from;
const isObjectLike = o => typeof o === 'object' && o !== null;
const isPlainObject = o => isObjectLike(o) && (oProtoToString.call(o) === OBJ_ID || oGetPrototypeOf(o) === null);
const isFunction = fn => typeof fn === 'function';
const wrap = fn => fn();

// Cue Library Object
const LIB = {};
// Cue State Library Object
const STATE_MODULE = oCreate(LIB);
// Cue UI Library Object
const UI_COMPONENT = oCreate(LIB);
