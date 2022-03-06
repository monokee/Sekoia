export const StateProvider = {
  setState(item) {
    this.__cache.set(++this.__uid, item);
    return this.__uid;
  },
  popState(uid) {
    uid = Number(uid);
    if (this.__cache.has(uid)) {
      const state = this.__cache.get(uid);
      this.__cache.delete(uid);
      return state;
    }
  },
  __cache: new Map(),
  __uid: -1
};