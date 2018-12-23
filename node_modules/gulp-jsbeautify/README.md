# gulp-jsbeautify

[![Build Status](https://travis-ci.org/sorrycc/gulp-jsbeautify.png)](https://travis-ci.org/sorrycc/gulp-jsbeautify)

js-beautify plugin for gulp.

----

## Install

```bash
$ npm install gulp-jsbeautify
```

## Usage

```bash
var beautify = require('gulp-jsbeautify');

gulp.task('beautify', function() {
  gulp.src('./src/*.js')
    .pipe(beautify({indentSize: 2}))
    .pipe(gulp.dest('./build/'));
});
```

## Options

You can pass in any options and it passes them directly to [js-beautify](https://github.com/einars/js-beautify#options).

## LICENSE

The MIT License (MIT)
