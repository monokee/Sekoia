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
    proto:    SOURCE_DIR + '/proto',
    eventBus: SOURCE_DIR + '/eventBus',
    plugins:  SOURCE_DIR + '/plugins',
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
    eventBus: [
      `${src.eventBus}/event-bus.js`
    ],
    plugins: [
      `${src.plugins}/index.js`,
      `${src.plugins}/public-api.js`,
    ],
    state: [

      `${src.state}/index.js`,
      `${src.state}/proto.js`,

      `${src.state}/utils/*.js`,

      `${src.state}/derivedProps/Derivative.js`,
      `${src.state}/derivedProps/OrderedDerivatives.js`,
      `${src.state}/derivedProps/installDependencies.js`,
      `${src.state}/derivedProps/dependencyGetInterceptor.js`,
      `${src.state}/derivedProps/branchWalkers.js`,

      `${src.state}/observe/createProxy.js`,
      `${src.state}/observe/proxyGetHandler.js`,
      `${src.state}/observe/proxySetHandler.js`,
      `${src.state}/observe/proxyDeleteHandler.js`,
      `${src.state}/observe/createInterceptedArrayMutator.js`,

      `${src.state}/reactionQueue/cueAll.js`,
      `${src.state}/reactionQueue/cueImmediate.js`,
      `${src.state}/reactionQueue/cueAccumulated.js`,
      `${src.state}/reactionQueue/react.js`,

      `${src.state}/module/StateInternals.js`,
      `${src.state}/module/createStateInstance.js`,
      `${src.state}/module/createStateFactory.js`,
      `${src.state}/module/extendStateFactoryPrototype.js`,
      `${src.state}/module/initializeStateModule.js`,
      `${src.state}/module/createStateFactoryInitializer.js`,

      `${src.state}/public-api.js`

    ],
    ui: [

      `${src.ui}/index.js`,
      `${src.ui}/proto.js`,

      `${src.ui}/utils/MappedClassList.js`,
      `${src.ui}/utils/CueStylesheet.js`,
      `${src.ui}/utils/createUniqueClassName.js`,
      `${src.ui}/utils/replaceClassNameInElement.js`,
      `${src.ui}/utils/scopeStylesToComponent.js`,
      `${src.ui}/utils/scopeKeyframesToComponent.js`,
      `${src.ui}/utils/createTemplateRootElement.js`,
      `${src.ui}/utils/reconcile.js`,
      `${src.ui}/utils/longestIncreasingSubsequence.js`,

      `${src.ui}/module/CueUIComponent.js`,
      `${src.ui}/module/initializeUIModule.js`,
      `${src.ui}/module/createComponentFactory.js`,

      `${src.ui}/public-api.js`

    ],
    app: [
      `${src.app}/proto.js`,
      `${src.app}/public-api.js`,
    ]
  };
  
  gulp
    .src([
      ...modules.core, 
      ...modules.proto,
      ...modules.eventBus,
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