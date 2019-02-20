
// Library stylesheet that components can write scoped classes to
const CUE_UI_STYLESHEET = wrap(() => {
  const stylesheet = document.createElement('style');
  stylesheet.id = 'CUE-STYLES';
  document.head.appendChild(stylesheet);
  return stylesheet.sheet;
});