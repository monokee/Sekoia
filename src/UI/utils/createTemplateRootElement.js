
function createTemplateRootElement(domString) {

  domString = domString.trim();

  switch (domString[0]) {
    case '<': return DOC.createRange().createContextualFragment(domString).firstChild;
    case '.': return DOC.getElementsByClassName(domString.substring(1))[0];
    case '#': return DOC.getElementById(domString.substring(1));
    case '[': return DOC.querySelectorAll(domString)[0];
    default:  throw new TypeError(`Can't create template from string because it's not html markup or a valid selector.`);
  }

}