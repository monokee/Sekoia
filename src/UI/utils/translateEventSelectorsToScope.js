
function translateEventSelectorsToScope(events, scopedStyles) {

  let eventName, x, selector;

  for (eventName in events) {

    x = events[eventName];

    if (isObjectLike(x)) { // event type has sub-selectors

      for (selector in x) {

        let normalizedSelector = selector;
        let subString, scopedSelector;

        // if selector doesnt start with (. # [ * ) and is not html5 tag name, assume omitted leading dot.
        if (selector[0] !== '.' && selector[0] !== '#' && selector[0] !== '[' && selector[0] !== '*' && !HTML5_TAGNAMES.has(selector)) {
          normalizedSelector = '.' + selector;
        }

        if (scopedStyles.has(normalizedSelector)) {
          scopedSelector = '.' + scopedStyles.get(normalizedSelector);
        } else if (scopedStyles.has((subString = normalizedSelector.substring(1)))) {
          scopedSelector = '.' + scopedStyles.get(subString);
        } else {
          scopedSelector = normalizedSelector;
        }

        // overwrite in-place
        if (scopedSelector !== selector) {
          x[scopedSelector] = x[selector];
          delete x[selector];
        }

      }
    }

  }

}