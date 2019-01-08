
function subscribeToStateInstance(property, handler, scope = null) {

  const _handler = scope === null ? handler : handler.bind(scope);

  if (this.observersOf.has(property)) {
    this.observersOf.get(property).push(_handler);
  } else {
    this.observersOf.set(property, [ _handler ]);
  }

}