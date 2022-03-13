const {series, src, dest} = require('gulp');
const rollup = require('gulp-better-rollup');
const minify = require('gulp-terser');
const rename = require('gulp-rename');
const iife = require('gulp-iife');
const footer = require('gulp-footer');
const removeCode = require('gulp-remove-code');

function buildIIFE() {
  return src('src/index.js')
    .pipe(rollup({}, 'esm'))
    .pipe(rename('sekoia.js'))
    .pipe(iife({
      useStrict: false,
      trimCode: true,
      prependSemicolon: false,
      bindThis: false,
      params: ['window'],
      args: ['window || this']
    }))
    .pipe(dest('build'));
}

function minifyIIFE() {
  return src('build/sekoia.js')
    .pipe(minify({
      mangle: {
        toplevel: true,
        keep_fnames: false,
        properties: {
          regex: new RegExp('^__') // properties and methods starting with two underscores are mangled
        }
      },
      output: {
        comments: false
      }
    }))
    .pipe(rename('sekoia.min.js'))
    .pipe(dest('build'));
}

function buildModule() {
  return src('src/index.js')
    .pipe(rollup({}, 'esm'))
    .pipe(removeCode({esModule: true}))
    .pipe(footer(`export {
  createElement,
  defineComponent,
  onResize,
  onDragOver,
  renderList,
  Router,
  deleteRequest,
  getRequest,
  onRequestStart,
  onRequestStop,
  postRequest,
  putRequest,
  createState,
  PersistentStorage,
  ReactiveArray,
  ReactiveObject,
  deepClone,
  deepEqual,
  hashString,
  throttle,
  defer
}`))
    .pipe(rename('sekoia.module.js'))
    .pipe(dest('build'));
}

exports.build = series(buildIIFE, minifyIIFE, buildModule);
