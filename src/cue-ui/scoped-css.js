
const { createUID } = CUE_PROTO;

// Library stylesheet that components can write scoped classes to
const CUE_UI_STYLESHEET = (() => {
  const stylesheet = document.createElement('style');
  stylesheet.id = 'CUE-STYLES';
  document.head.appendChild(stylesheet);
  return stylesheet.sheet;
})();

// CSS Helpers to generate Component-scoped classes and keyframes
function scopeStylesToComponent(styles, template) {

  let className, classRules, classRule, pseudoRuleIndex, pseudoRuleStyle, uniqueClassName, ruleIndex, ruleStyle;

  for (className in styles) {

    uniqueClassName = `${className}-${createUID()}`;

    ruleIndex = CUE_UI_STYLESHEET.insertRule(`.${uniqueClassName} {}`, CUE_UI_STYLESHEET.cssRules.length);
    ruleStyle = CUE_UI_STYLESHEET.cssRules[ruleIndex].style;

    classRules = styles[className];

    for (classRule in classRules) {
      if (classRule[0] === ':' || classRule[0] === ' ') {
        pseudoRuleIndex = CUE_UI_STYLESHEET.insertRule(`.${uniqueClassName}${classRule} {}`, CUE_UI_STYLESHEET.cssRules.length);
        pseudoRuleStyle = CUE_UI_STYLESHEET.cssRules[pseudoRuleIndex].style;
        Object.assign(pseudoRuleStyle, classRules[classRule]);
        delete classRules[classRule];
      }
    }

    Object.assign(ruleStyle, classRules);
    styles[className] = uniqueClassName;

    if (template) {
      replaceClassNameInElement(className, uniqueClassName, template);
    }

  }

  return styles;

}

function replaceClassNameInElement(a, b, element) {
  element.classList.replace(a, b);
  for (let i = 0; i < element.children.length; i++) {
    replaceClassNameInElement(a, b, element.children[i]);
  }
}

function scopeKeyframesToComponent(keyframes) {

  let name, uniqueName, framesIndex, framesSheet, frames, percent, index, style;

  for (name in keyframes) {

    uniqueName = `${name}-${createUID()}`;

    framesIndex = CUE_UI_STYLESHEET.insertRule(`@keyframes ${uniqueName} {}`, CUE_UI_STYLESHEET.cssRules.length);
    framesSheet = CUE_UI_STYLESHEET.cssRules[framesIndex];

    frames = keyframes[name];

    for (percent in frames) {
      framesSheet.appendRule(`${percent}% {}`);
      index = framesSheet.cssRules.length - 1;
      style = framesSheet.cssRules[index].style;
      Object.assign(style, frames[percent]);
    }

    keyframes[name] = uniqueName;

  }

  return keyframes;

}