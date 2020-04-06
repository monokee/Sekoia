const {series, src, dest} = require('gulp');
const rollup = require('gulp-better-rollup');
const minify = require('gulp-babel-minify');
const rename = require('gulp-rename');
const iife = require('gulp-iife');
const footer = require('gulp-footer');
const removeCode = require('gulp-remove-code');

function buildIIFE() {
  return src('src/index.js')
    .pipe(rollup({}, 'esm'))
    .pipe(rename('cue.js'))
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
  return src('build/cue.js')
    .pipe(minify({
      mangle: {
        topLevel: true
      }
    }))
    .pipe(rename('cue.min.js'))
    .pipe(dest('build'));
}

function buildModule() {
  return src('src/index.js')
    .pipe(rollup({}, 'esm'))
    .pipe(removeCode({esModule: true}))
    .pipe(footer('export {Component, Store, Server, Router};'))
    .pipe(rename('cue.module.js'))
    .pipe(dest('build'));
}

exports.build = series(buildIIFE, minifyIIFE, buildModule);
