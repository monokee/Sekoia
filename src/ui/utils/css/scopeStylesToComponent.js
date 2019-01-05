
function scopeStylesToComponent(styles, template) {

  let className, classRules, classRule, pseudoRuleIndex, pseudoRuleStyle, uniqueClassName, ruleIndex, ruleStyle;

  for (className in styles) {

    uniqueClassName = createUniqueClassName(className);

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