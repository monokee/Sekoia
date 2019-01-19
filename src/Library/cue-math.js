
Cue.Plugin('cue-math', Library => {

  // Math Helpers
  const MTH = Math;
  const MAX = MTH.max;
  const MIN = MTH.min;
  const RANDOM = MTH.random;
  const ABS = MTH.abs;
  const POW = MTH.pow;
  const ROUND = MTH.round;
  const FLOOR = MTH.floor;
  const CEIL = MTH.ceil;
  const PI = MTH.PI;
  const DEG2RAD = PI / 180;
  const RAD2DEG = 180 / PI;

  return Library.core.Math = {

    clamp(min, max, val) {
      return MAX(min, MIN(max, val));
    },

    lerp(from, to, x) {
      return (1 - x) * from + x * to;
    },

    smoothStep(min, max, val) {
      if ( val <= min ) return 0;
      if ( val >= max ) return 1;
      val = (val - min) / (max - min);
      return val * val * (3 - 2 * val);
    },

    translate(sourceMin, sourceMax, targetMin, targetMax, x) {
      return targetMin + (x - sourceMin) * (targetMax - targetMin) / (sourceMax - sourceMin);
    },

    createTranslator(sourceMin, sourceMax, targetMin, targetMax) {
      // creates runtime optimized linear range interpolation functions for static ranges
      if (sourceMin === 0 && targetMin > 0) return val => ((val * (targetMax - targetMin)) / sourceMax) + targetMin;
      if (targetMin === 0 && sourceMin > 0) return val => (((val - sourceMin) * targetMax) / (sourceMax - sourceMin));
      if (sourceMin === 0 === targetMin)    return val => (val * targetMax) / targetMax;
      return this.translate;
    },

    convertBits(sourceBits, targetBits, val) {
      if (sourceBits < 32) {
        if (targetBits < 32) {
          return val * POW(2, targetBits) / POW(2, sourceBits);
        } else {
          return val / POW(2, sourceBits);
        }
      } else {
        if (targetBits < 32) {
          return ROUND(val * POW(2, targetBits));
        } else {
          return val;
        }
      }
    },

    randomIntBetween(min, max) {
      return FLOOR(RANDOM() * (max - min + 1) + min);
    },

    randomFloatBetween(min, max) {
      return RANDOM() * (max - min) + min;
    },

    isOdd(val) {
      return val & 1;
    },

    isEven(val) {
      return !(val & 1);
    },

    degreesToRadians(degrees) {
      return degrees * DEG2RAD;
    },

    radiansToDegrees(radians) {
      return radians * RAD2DEG;
    },

    scale(numericArray, targetLength) {

      // 1D Linear Interpolation
      const il = numericArray.length - 1, ol = targetLength - 1, s = il / ol;

      let i, a = 0, b = 0, c = 0, d = 0;

      for (i = 1; i < ol; i++) {
        a = i * s; b = FLOOR(a); c = CEIL(a); d = a - b;
        numericArray[i] = numericArray[b] + (numericArray[c] - numericArray[b]) * d;
      }

      numericArray[ol] = numericArray[il];

      return this;

    },

    closest(numericArray, val) {
      return numericArray.reduce((prev, cur) => (ABS(cur - val) < ABS(prev - val) ? cur : prev));
    },

    smallest(numericArray) {
      let min = Infinity;
      for (let i = 0; i < numericArray.length; i++) {
        if (numericArray[i] < min) min = numericArray[i];
      }
      return min === Infinity ? void 0 : min;
    },

    largest(numericArray) {
      let max = -Infinity;
      for (let i = 0; i < numericArray.length; i++) {
        if (numericArray[i] > max) max = numericArray[i];
      }
      return max === -Infinity ? void 0 : max;
    }

  };

}, true);