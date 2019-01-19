
function createUniqueClassName(name) {

  const letters = 'abcdefghijklmnopqrstuvwxyz';

  let sessionCounter = 0;

  return ((createUniqueClassName = function(name) {

    let n, o = '';
    const alphaHex = sessionCounter.toString(26).split('');
    while((n = alphaHex.shift())) o += letters[parseInt(n, 26)];
    sessionCounter++;
    return `${name}-${o}`;

  }).call(null, name));

}