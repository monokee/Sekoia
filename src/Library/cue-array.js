
Cue.Plugin('cue-array', Library => {

  const isArray = Array.isArray;

  return Library.core.Array = {

    flatten(nDimArray) {
      return nDimArray.reduce((x, y) => x.concat(isArray(y) ? this.flatten(y) : y), []);
    },

    insertEveryNth(array, item, n) {
      let i = array.length;
      while (--i > 0) if (i % n === 0) array.splice(i, 0, item);
      return this;
    },

    removeEveryNth(array, n) {
      let i = array.length;
      while (--i) if (i % n === 0) array.splice(i, 1);
      return this;
    },

    removeRange(array, from, to) {
      array.splice(from, to - from);
      return this;
    },

    merge(target, ...sources) {

      let i, k, s;
      for (i = 0; i < sources.length; i++) {
        s = sources[i];
        for (k = 0; k < s.length; k++) {
          target.push(s[k]);
        }
      }

      return this;

    }

  };

}, true);