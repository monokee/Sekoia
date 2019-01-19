
function scopeKeyframesToComponent(keyframes) {

  let name, uniqueName, framesIndex, framesSheet, frames, percent, index, style;

  for (name in keyframes) {

    uniqueName = createUniqueClassName(name);

    framesIndex = CUE_UI_STYLESHEET.insertRule(`@keyframes ${uniqueName} {}`, CUE_UI_STYLESHEET.cssRules.length);
    framesSheet = CUE_UI_STYLESHEET.cssRules[framesIndex];

    frames = keyframes[name];

    for (percent in frames) {
      framesSheet.appendRule(`${percent}% {}`);
      index = framesSheet.cssRules.length - 1;
      style = framesSheet.cssRules[index].style;
      oAssign(style, frames[percent]);
    }

    keyframes[name] = uniqueName;

  }

  return keyframes;

}