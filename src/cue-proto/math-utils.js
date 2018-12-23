
assign(CUE_PROTO, {

  clamp(min, max, val) {
    return MAX(min, MIN(max, val));
  },

  lerp(from, to, proportionFloat) {
    return (1 - proportionFloat) * from + proportionFloat * to;
  },

  smoothStep(min, max, val) {
    if ( val <= min ) return 0;
    if ( val >= max ) return 1;
    val = (val - min) / (max - min);
    return val * val * (3 - 2 * val);
  },

  interpolateLinear(aMin, aMax, bMin, bMax, val) {
    return bMin + (val - aMin) * (bMax - bMin) / (aMax - aMin);
  },

  createLinearInterpolator(aMin, aMax, bMin, bMax) {

    // creates runtime optimized linear range interpolation functions for static ranges

    if (!arguments.length) {

      return this.interpolateLinear;

    } else {

      if (aMin === 0 && bMin > 0) {

        return val => ((val * (bMax - bMin)) / aMax) + bMin;

      } else if (bMin === 0 && aMin > 0) {

        return val => (((val - aMin) * bMax) / (aMax - aMin));

      } else if (aMin === 0 && bMin === 0) {

        return v => (v * bMax) / bMax;

      } else {

        return this.interpolateLinear;

      }

    }

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

  randomIntegerBetween(min, max) {
    return FLOOR(RANDOM() * (max - min + 1) + min);
  },

  randomFloatBetween(min, max) {
    return RANDOM() * (max - min) + min;
  },

  isOddNumber(val) {
    return val & 1;
  },

  isEvenNumber(val) {
    return !(val & 1);
  },

  degreesToRadians(degrees) {
    return degrees * DEG2RAD;
  },

  radiansToDegrees(radians) {
    return radians * RAD2DEG;
  }

});