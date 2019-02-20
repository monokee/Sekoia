const gulp = require('gulp');
const iife = require('gulp-iife');
const beautify = require('gulp-jsbeautify');
const minify = require('gulp-babel-minify');
const concat = require('gulp-concat');
const rename = require('gulp-rename');

const NAME = 'cue';
const SOURCE_DIR = 'src';
const BUILD_DIR = 'build';

const MODULES = {
  eventBus:   SOURCE_DIR + '/EventBus',
  state:      SOURCE_DIR + '/State',
  ui:         SOURCE_DIR + '/UI',
  plugin:     SOURCE_DIR + '/Plugin',
  composite:  SOURCE_DIR + '/Composite',
  library:    SOURCE_DIR + '/Library',
};

const FILES = {
  index: [
    `${SOURCE_DIR}/index.js`
  ],
  eventBus: [
    `${SOURCE_DIR}/EventBus/public-api.js`
  ],
  state: [

    `${MODULES.state}/index.js`,

    `${MODULES.state}/utils/*.js`,

    `${MODULES.state}/transductions/*.js`,

    `${MODULES.state}/derivatives/Derivative.js`,
    `${MODULES.state}/derivatives/OrderedDerivatives.js`,
    `${MODULES.state}/derivatives/installDependencies.js`,
    `${MODULES.state}/derivatives/dependencyGetInterceptor.js`,
    `${MODULES.state}/derivatives/branchWalkers.js`,

    `${MODULES.state}/proxy/proxyGetHandler.js`,
    `${MODULES.state}/proxy/proxySetHandler.js`,
    `${MODULES.state}/proxy/proxyDeleteHandler.js`,

    `${MODULES.state}/reactions/react.js`,

    `${MODULES.state}/module/buildStateModule.js`,
    `${MODULES.state}/module/StateInternals.js`,
    `${MODULES.state}/module/createState.js`,
    `${MODULES.state}/module/createStateFactoryInitializer.js`,

    `${MODULES.state}/proto.js`,
    `${MODULES.state}/public-api.js`

  ],
  ui: [

    `${MODULES.ui}/index.js`,
    `${MODULES.ui}/proto.js`,

    `${MODULES.ui}/utils/htmlTagNames.js`,
    `${MODULES.ui}/utils/CueStylesheet.js`,
    `${MODULES.ui}/utils/scopeStylesToComponent.js`,
    `${MODULES.ui}/utils/translateEventSelectorsToScope.js`,
    `${MODULES.ui}/utils/createTemplateRootElement.js`,
    `${MODULES.ui}/utils/reconcile.js`,
    `${MODULES.ui}/utils/installStateReactions.js`,
    `${MODULES.ui}/utils/bindComponentEvents.js`,

    `${MODULES.ui}/module/ComponentInstance.js`,
    `${MODULES.ui}/module/initializeUIComponent.js`,
    `${MODULES.ui}/module/createComponentFactory.js`,

    `${MODULES.ui}/public-api.js`

  ],
  plugin: [
    `${MODULES.plugin}/index.js`,
    `${MODULES.plugin}/public-api.js`,
  ],
  composite: [
    `${MODULES.composite}/CueComposite.js`
  ],
  publicAPI: [
    `${SOURCE_DIR}/public-api.js`
  ],
  library: [
    `${MODULES.library}/cue-math.js`,
    `${MODULES.library}/cue-string.js`,
    `${MODULES.library}/cue-array.js`,
    `${MODULES.library}/cue-equality.js`,
    `${MODULES.library}/cue-clone.js`,
    `${MODULES.library}/cue-function.js`
  ]
};

gulp.task('build-lib', function() {
  
  return gulp
    .src([
      ...FILES.index,
      ...FILES.eventBus,
      ...FILES.state,
      ...FILES.ui,
      ...FILES.plugin,
      ...FILES.composite,
      ...FILES.publicAPI,
      ...FILES.library
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

    .pipe(gulp.dest(BUILD_DIR))
    .pipe(rename(`${NAME}.min.js`))
    .pipe(minify())
    .pipe(gulp.dest(BUILD_DIR));

});