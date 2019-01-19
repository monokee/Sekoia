
Cue.Plugin('cue-string', Library => {

  return Library.core.String = {

    createUID() {

      const letters = 'abcdefghijklmnopqrstuvwxyz';

      let sessionCounter = 0;

      return ((this.createUID = function createUID() {

        let n, o = '';
        const alphaHex = sessionCounter.toString(26).split('');
        while((n = alphaHex.shift())) o += letters[parseInt(n, 26)];
        sessionCounter++;
        return o;

      }).call(this));

    },

    toCamelCase(dashed_string) {
      const c = document.createElement('div');
      c.setAttribute(`data-${dashed_string}`, '');
      return oKeys(c.dataset)[0];
    },

    toDashedCase(camelString) {
      const c = document.createElement('div');
      c.dataset[camelString] = '';
      return c.attributes[0].name.substr(5);
    }

  };

});