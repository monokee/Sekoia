
function createTemplateRootElement(x) {

  if (typeof x === 'string') {

    x = x.trim();

    switch (x[0]) {
      case '<': return document.createRange().createContextualFragment(x).firstChild;
      case '.': return document.getElementsByClassName(x.substring(1))[0];
      case '#': return document.getElementById(x.substring(1));
      case '[': return document.querySelectorAll(x)[0];
      default:  throw new TypeError(`Can't create template from string because it's not html markup or a valid selector.`);
    }

  } else if (x instanceof Element) {

    return x;

  }

}