
function attemptCue(prop, value, oldValue) {

  const drv = this.derivativesOf.get(prop);
  const obs = this.observersOf.get(prop);

  if (drv || obs) {

    if (isAccumulating) {
      cueImmediate(prop, value, oldValue, obs, drv, false);
    } else {
      cueAll(prop, value, oldValue, obs, drv, false);
    }

    return true;

  } else {

    return false;

  }

}