"use strict";

var through = require("through2");
var applySourceMap = require("vinyl-sourcemaps-apply");
var iife = require("./iife");

module.exports = function gulpIife(userOptions) {
    return through.obj(function (file, encoding, callback) {
        var contents = String(file.contents);
        var sourceMapOptions = file.sourceMap ? { fileName: file.relative } : null;

        var result = iife.surround(contents, userOptions, sourceMapOptions);
        file.contents = Buffer(result.code);

        if (file.sourceMap) {
            applySourceMap(file, result.sourceMap);
        }

        callback(null, file);
    });
};