
function scopeStylesToComponent(styles, template) {

  const map = new Map();
  if (!styles) return map;

  let className, classRules, classRule, pseudoRuleIndex, pseudoRuleStyle, uniqueClassName, ruleIndex, ruleStyle;

  for (className in styles) {

    uniqueClassName = createUniqueClassName(className);

    ruleIndex = CUE_UI_STYLESHEET.insertRule(`.${uniqueClassName} {}`, CUE_UI_STYLESHEET.cssRules.length);
    ruleStyle = CUE_UI_STYLESHEET.cssRules[ruleIndex].style;

    classRules = styles[className];

    for (classRule in classRules) {
      if (isObjectLike(classRules[classRule])) { // nested selectors with basic sass functionality.
        if (classRule[0] === '&') { // chain onto the selector
          pseudoRuleIndex = CUE_UI_STYLESHEET.insertRule(`.${uniqueClassName}${classRule.substring(1)} {}`, CUE_UI_STYLESHEET.cssRules.length);
        } else { // nest the selector (space separation)
          pseudoRuleIndex = CUE_UI_STYLESHEET.insertRule(`.${uniqueClassName} ${classRule} {}`, CUE_UI_STYLESHEET.cssRules.length);
        }
        pseudoRuleStyle = CUE_UI_STYLESHEET.cssRules[pseudoRuleIndex].style;
        oAssign(pseudoRuleStyle, classRules[classRule]);
        delete classRules[classRule];
      }
    }

    oAssign(ruleStyle, classRules);
    map.set(className, uniqueClassName);

    if (template) {
      replaceClassNameInElement(className, uniqueClassName, template);
    }

  }

  return map;

}