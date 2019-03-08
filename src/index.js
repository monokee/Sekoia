
/*
 *
 * ☉ Cue - Atomically Reactive Web Apps
 *
 * @author Jonathan M. Ochmann
 * Copyright 2019 Patchflyer GmbH
 *
 */

// Meta Keys used for closure scope lookup && safely extending foreign objects
const __CUE__ = Symbol('☉');

// Builtins
const DOC = document;
const OBJ = Object;
const ARR = Array;
const OBJ_ID = '[object Object]';
const EMPTY_MAP = new Map();
const EMPTY_STRING = '';
const EMPTY_ARRAY = [];

// Static Object/Array Helpers
const oAssign = OBJ.assign;
const oCreate = OBJ.create;
const oDefineProperty = OBJ.defineProperty;
const oGetPrototypeOf = OBJ.getPrototypeOf;
const oProtoToString = OBJ.prototype.toString;

// Utility methods
const NOOP = ()=>{};
const oKeys = OBJ.keys;
const isArray = ARR.isArray;
const toArray = ARR.from;
const isObjectLike = o => typeof o === 'object' && o !== null;
const isPlainObject = o => isObjectLike(o) && (oProtoToString.call(o) === OBJ_ID || oGetPrototypeOf(o) === null);
const isFunction = fn => typeof fn === 'function';
const wrap = fn => fn();

let uid = 0;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const createUID = name => {
  let n, o = '', alphaHex = uid.toString(26).split('');
  while ((n = alphaHex.shift())) o += ALPHABET[parseInt(n, 26)];
  uid++;
  return `${name||'cue'}_${o}`;
};

// Cue Library Object
const LIB = {};
// Cue State Library Object
const STATE_MODULE = oCreate(LIB);
// Cue UI Library Object
const UI_COMPONENT = oCreate(LIB);

// Cue API Object that internal modules attach their public api to (properties will be exposed on global.Cue)
const CUE_API = {};
