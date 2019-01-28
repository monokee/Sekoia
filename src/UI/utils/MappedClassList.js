
// Implementation of DOM ClassList that works with mapped classNames
// Useful when a component has generated unique, component-scoped classNames
// but we want to work with the user-defined classNames in our high-level code.

const __mappedClassNames__ = Symbol('ClassName Map');
const __elementClassList__ = Symbol('Original ClassList');

class MappedClassList {

  constructor(map, element) {

    if (!map) {
      throw new TypeError(`Can't create MappedClassList. First argument has to be a plain Object, 2D Array or a Map but is ${JSON.stringify(map)}.`);
    } else if (map.constructor === OBJ) {
      map = new Map(oEntries(map));
    } else if (isArray(map)) {
      map = new Map(map);
    }
    
    // internalize map and original classList
    oDefineProperties(this, {
      [__mappedClassNames__]: {
        value: map
      },
      [__elementClassList__]: {
        value: element.classList // internal reference to original classList.
      }
    });

  }

  item(index) {
    return this[__elementClassList__].item(index);
  }

  has(token) {
    return this.contains(token);
  }

  contains(token) {
    return this[__elementClassList__].contains(this[__mappedClassNames__].get(token) || token);
  }

  add(token) {
    this[__elementClassList__].add(this[__mappedClassNames__].get(token) || token);
  }

  remove(token) {
    this[__elementClassList__].remove(this[__mappedClassNames__].get(token) || token);
  }

  replace(existingToken, newToken) {
    this[__elementClassList__].replace((this[__mappedClassNames__].get(existingToken) || existingToken), (this[__mappedClassNames__].get(newToken) || newToken));
  }

  toggle(token) {
    this[__elementClassList__].toggle(this[__mappedClassNames__].get(token) || token);
  }

}