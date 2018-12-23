
// Implementation of DOM ClassList that works with mapped classNames
// Useful when a component has generated unique, component-scoped classNames
// but we want to work with the user-defined classNames in our high-level code.

class MappedClassList {

  constructor(map, element) {

    if (!map) {
      throw new TypeError(`Can't create MappedClassList. First argument has to be a plain Object or a Map but is ${JSON.stringify(map)}.`);
    } else if (map.constructor === Object) {
      map = new Map(Object.entries(map));
    } else if (Array.isArray(map)) {
      map = new Map(map);
    }

    Object.defineProperties(this, {
      __map__: {
        value: map
      },
      __org__: {
        value: element.classList
      }
    });

  }

  item(index) {
    return this.__org__.item(index);
  }

  contains(token) {
    return this.__org__.contains(this.__map__.get(token) || token);
  }

  add(token) {
    this.__org__.add(this.__map__.get(token) || token);
  }

  remove(token) {
    this.__org__.remove(this.__map__.get(token) || token);
  }

  replace(existingToken, newToken) {
    this.__org__.replace((this.__map__.get(existingToken) || existingToken), (this.__map__.get(newToken) || newToken));
  }

  toggle(token) {
    this.__org__.toggle(this.__map__.get(token) || token);
  }

}