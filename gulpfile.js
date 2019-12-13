const {task, src, dest} = require('gulp');
const minify = require('gulp-babel-minify');
const rename = require('gulp-rename');

task('minify-bundle', function() {
  return src('build/cue.js')
    .pipe(rename('cue.min.mjs'))
    .pipe(minify({
      mangle: {
        topLevel: true
      }
    }))
    .pipe(rename('cue.min.js'))
    .pipe(dest('build'));
});