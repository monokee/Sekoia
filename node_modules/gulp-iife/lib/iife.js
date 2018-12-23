"use strict";

var _ = require("lodash");
var SourceMapGenerator = require("source-map").SourceMapGenerator;

module.exports = {
    surround: surround
};

var defaultOptions = {
    args: undefined,
    params: undefined,
    prependSemicolon: true,
    useStrict: true,
    trimCode: true,
    generateSourceMap: true
};

function surround(code, userOptions, sourceMapOptions) {
    var options = _.merge({}, defaultOptions, userOptions);

    var useStrictLines = options.useStrict ? ["\"use strict\";", ""] : [];
    var trimmedCode = options.trimCode ? code.trim() : code;
    var prependedSemicolon = options.prependSemicolon ? ";" : "";
    var bindThis = options.bindThis ? ".bind(this)" : "";

    var _getArgsAndParams = getArgsAndParams(options);

    var args = _getArgsAndParams.args;
    var params = _getArgsAndParams.params;


    var lines = [prependedSemicolon + "(function(" + params + ") {"].concat(useStrictLines, [trimmedCode, "}" + bindThis + "(" + args + "));", ""]);

    var result = {
        code: lines.join("\n")
    };

    if (sourceMapOptions && options.generateSourceMap !== false) {
        result.sourceMap = generateSourceMap(code, options, sourceMapOptions);
    }

    return result;
}

function getArgsAndParams(options) {
    var params = options.params || options.args || [];
    var args = options.args || options.params || [];

    return {
        args: args.join(", "),
        params: params.join(", ")
    };
}

function generateSourceMap(originalCode, options, sourceMapOptions) {
    // We don't care about trailing lines for the mapping
    var code = originalCode.trimRight();

    var sourceMapGenerator = new SourceMapGenerator({
        file: sourceMapOptions.fileName
    });

    // We have at least one line of positive offset because of the start of the IIFE
    var linesOffset = 1;

    // Then we have optionally two more lines because of the "use strict"
    // and the empty line after that
    linesOffset += options.useStrict ? 2 : 0;

    // Then we have negative lines for the leading empty lines that are trimmed
    var leadingEmptyLines = ((code.match(/^\s+/) || [""])[0].match(/\n/g) || []).length;
    linesOffset -= options.trimCode ? leadingEmptyLines : 0;

    // We add sourcemaps only for the non-empty lines.
    // So, we start the loop in the first non-empty line.
    // (The trailing empty lines are already trimmed.)
    var codeLines = (code.trimLeft().match(/\n/g) || []).length + 1;

    for (var i = 1 + leadingEmptyLines; i <= codeLines + leadingEmptyLines; i++) {
        sourceMapGenerator.addMapping({
            source: sourceMapOptions.fileName,
            original: {
                line: i,
                column: 0
            },
            generated: {
                line: i + linesOffset,
                column: 0
            }
        });
    }

    return sourceMapGenerator.toString();
}