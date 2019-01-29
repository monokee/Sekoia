
// Implementation of DOM ClassList that works with mapped classNames
// Useful when a component has generated unique, component-scoped classNames
// but we want to work with the user-defined classNames in our high-level code.

const __mappedClassNames__ = Symbol('ClassName Map');
const __elementClassList__ = Symbol('Original ClassList');

class MappedClassList {

  constructor(map, element) {

    if (isArray(map)) {
      map = new Map(map);
    } else if (isObjectLike(map)) {
      map = new Map(oEntries(map));
    }

    this[__mappedClassNames__] = map;
    this[__elementClassList__] = element.classList;

  }

  get(token) {
    return this[__mappedClassNames__].get(token) || token;
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