
/**
 * Little CSS in JS Utility which scopes the passed styles object to the template element.
 * The rules for this are:
 * - Every template element is assigned a globally unique class name ".cue-uid"
 * - This is required to scope nested elements uniquely to the template container.
 * - All styles that are being specified in the styles object are assumed to target either tag names, classes or ids.
 * - If a template element contains an element with the tag name that matches a specified top-level style, the tag name takes precedence over class names.
 * - Top-level (ie not nested) tag names are scoped to the component by creating CSS rules in the form of ".cue-uid tag {...}"
 * - Top-level class names are scoped to the component in the form of ".cue-uid__className {...}". Note the underline. We do this to avoid overly complex selectors.
 * - CSS Rules can be written in nested SCSS style syntax including nested chaining by inserting "&" before the property name ie "&:hover", "&.active" etc...
 * @param   {object}      styles    - The styles object. Must be a plain object of strings and nested objects containing style rules.
 * @param   {HTMLElement} template  - The template html element. This is the element that is used for cloning instances.
 * @returns {Map}                   - A Map object which contains mapping from original class names to scoped class names (or an empty map)
 */
function scopeStylesToComponent(styles, template) {

  const classMap = new Map();

  if (!styles) return classMap;

  const scope = `cue-${CUE_UI_STYLESHEET.cssRules.length.toString(36)}`;

  for (const key in styles) {
    insertStyleRule(prepareSelectorName(key, scope, template, classMap), styles[key]);
  }

  template.classList.add(scope);

  classMap.forEach((scopedClassName, originalClassName) => {
    replaceClassNameInElement(originalClassName, scopedClassName, template);
  });

  return classMap;

}

function getScopedSelectorName(element, scope, selector, classMap) {
  if (element.getElementsByTagName(selector).length) {
    return `.${scope} ${selector}`;
  } else if (selector[0] === '#') {
    return selector;
  } else {
    selector = selector.replace('.','');
    return `.${classMap.set(selector, `${selector}__${scope}`).get(selector)}`;
  }
}

function prepareSelectorName(key, scope, template, classMap) {

  if (key.indexOf(',') > -1) {

    const selectors = key.split(',');
    const scopedSelectors = [];

    for (let i = 0; i < selectors.length; i++) {
      scopedSelectors.push(getScopedSelectorName(template, scope, selectors[i], classMap));
    }

    return scopedSelectors.join(', ');

  } else {

    return getScopedSelectorName(template, scope, key, classMap);
  }

}

function insertStyleRule(selectorName, styleProperties) {

  let prop;

  let variables = ''; // variables have to be in the rule at insertion time or they wont work.
  for (prop in styleProperties) {

    if (prop.indexOf('--', 0) === 0) {
      variables += `${prop}: ${styleProperties[prop]}; `;
      delete styleProperties[prop];
    }

  }

  const ruleIndex = CUE_UI_STYLESHEET.insertRule(`${selectorName} { ${variables} } `, CUE_UI_STYLESHEET.cssRules.length);
  const styleRule = CUE_UI_STYLESHEET.cssRules[ruleIndex].style;

  for (prop in styleProperties) {

    if (styleProperties[prop].constructor === OBJ) {

      if (prop[0] === '&') {
        insertStyleRule(`${selectorName}${prop.substring(1)}`, styleProperties[prop]);
      } else {
        insertStyleRule(`${selectorName} ${prop}`, styleProperties[prop]);
      }

    } else {

      styleRule[prop] = styleProperties[prop];

    }

  }

}