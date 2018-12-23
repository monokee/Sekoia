const gulp = require('gulp');
const iife = require('gulp-iife');
const beautify = require('gulp-jsbeautify');
const minify = require('gulp-babel-minify');
const concat = require('gulp-concat');

const NAME = 'cue';
const SOURCE_DIR = 'src';
const BUILD_DIR = 'build';

gulp.task('build-lib', function() {

  const src = {
    core:     SOURCE_DIR + '/core',
    plugins:  SOURCE_DIR + '/plugins',
    proto:    SOURCE_DIR + '/proto',
    state:    SOURCE_DIR + '/state',
    ui:       SOURCE_DIR + '/ui',
    app:      SOURCE_DIR + '/app'
  };
  
  const modules = {
    core: [
      `${src.core}/index.js`,
      `${src.core}/utils.js`
    ],
    proto: [
      `${src.proto}/index.js`,
      `${src.proto}/math-utils.js`,
      `${src.proto}/string-utils.js`,
      `${src.proto}/obj-utils.js`,
      `${src.proto}/array-utils.js`,
      `${src.proto}/fn-utils.js`
    ],
    plugins: [
      `${src.plugins}/index.js`,
      `${src.plugins}/public-api.js`,
    ],
    state: [
      `${src.state}/index.js`,
      `${src.state}/state-proto.js`,
      `${src.state}/observable.js`,
      `${src.state}/observer.js`,
      `${src.state}/derivatives.js`,
      `${src.state}/reaction-cue.js`,
      `${src.state}/public-api.js`
    ],
    ui: [
      `${src.ui}/index.js`,
      `${src.ui}/ui-proto.js`,
      `${src.ui}/reactor.js`,
      `${src.ui}/mapped-classList.js`,
      `${src.ui}/scoped-css.js`,
      `${src.ui}/reconcile.js`,
      `${src.ui}/ui-wrapper.js`,
      `${src.ui}/public-api.js`
    ],
    app: [
      `${src.app}/app-proto.js`,
      `${src.app}/public-api.js`,
    ]
  };
  
  gulp
    .src([
      ...modules.core, 
      ...modules.proto, 
      ...modules.plugins, 
      ...modules.state, 
      ...modules.ui,
      ...modules.app
    ])

    .pipe(concat(`${NAME}.js`))

    .pipe(iife({
      useStrict: false,
      trimCode: false,
      prependSemicolon: false,
      bindThis: false,
      params: ['global'],
      args: ['window || this']
    }))

    .pipe(beautify({
      indent_size: 2,
      end_with_newline: false,
      keep_array_indentation: true,
      max_preserve_newlines: 2
    }))

    .pipe(gulp.dest(BUILD_DIR));

});

gulp.task('minify-lib', function() {

  gulp
    .src([`${BUILD_DIR}/${NAME}.js`])
    .pipe(concat(`${NAME}.min.js`))
    .pipe(minify())
    .pipe(gulp.dest(BUILD_DIR));
  
});