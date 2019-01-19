
Cue.Plugin('cue-clone', Library => {

  const Obj = Object;
  const ObjToString = Obj.prototype.toString;
  const ObjID = '[object Object]';

  const isArray = Array.isArray;
  const getProto = Object.getPrototypeOf;

  return Obj.assign(Library.core, {

    clone(o, deep = false) {

      if (isArray(o)) return this.cloneArray(o, deep);

      if (typeof o === 'object' && o !== null) {

        if (ObjToString.call(o) === ObjID || getProto(o) === null) return this.clonePlainObject(o, deep);
        if (o instanceof Map) return this.cloneMap(o, deep);
        if (o instanceof Set) return this.cloneSet(o, deep);
        if (o instanceof Date) return new Date(o.getTime());
        if (o instanceof RegExp) return RegExp(o.source, o.flags);

      }

      throw new TypeError(`Can't clone non-object, null or undefined."`);

    },

    cloneArray(a, deep = false) {

      if (deep) {

        const clone = [];

        for (let i = 0, v; i < a.length; i++) {
          v = a[i];
          clone.push(typeof v === 'object' && v !== null ? this.clone(v, deep) : v);
        }

        return clone;

      } else {

        return a.slice();

      }

    },

    clonePlainObject(o, deep = false) {

      if (deep) {

        const clone = {};

        let k, v;
        for (k in o) {
          v = o[k];
          clone[k] = typeof v === 'object' && v !== null ? this.clone(v, deep) : v;
        }

        return clone;

      } else {

        return Obj.assign({}, o);

      }

    },

    cloneMap(m, deep = false) {

      const clone = new Map();

      if (deep) {
        m.forEach((val, key) => clone.set(typeof key === 'object' ? this.clone(key, deep) : key, typeof val === 'object' && val !== null ? this.clone(val, deep) : val));
      } else {
        m.forEach((val, key) => clone.set(key, val));
      }

      return clone;

    },

    cloneSet(s, deep = false) {

      const clone = new Set();
      s.forEach(entry => clone.add(deep && typeof entry === 'object' && entry !== null ? this.clone(entry, deep) : entry));
      return clone;

    }

  });

}, true);