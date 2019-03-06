
// Library stylesheet that components can write scoped classes to
const CUE_UI_STYLESHEET = wrap(() => {
  const stylesheet = DOC.createElement('style');
  stylesheet.id = 'CUE-STYLES';
  DOC.head.appendChild(stylesheet);
  return stylesheet.sheet;
});