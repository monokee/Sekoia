const {series, src, dest} = require('gulp');
const rollup = require('gulp-better-rollup');
const minify = require('gulp-babel-minify');
const rename = require('gulp-rename');

function build() {
  return src('src/index.js')
    .pipe(rollup({}, 'esm'))
    .pipe(rename('cue.js'))
    .pipe(dest('build'));
}

function minifyBuild() {
  return src('build/cue.js')
    .pipe(rename('cue.min.mjs'))
    .pipe(minify({
      mangle: {
        topLevel: true
      }
    }))
    .pipe(rename('cue.min.js'))
    .pipe(dest('build'));
}

exports.build = series(build, minifyBuild);
