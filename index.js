const dir = require('node-dir');
const resolve = require('path').resolve;
const path        = require('path');
const through     = require('through2');
const gutil       = require('gulp-util');
const PluginError = gutil.PluginError;

const FileExt = {
    JS: '.js',
    Html: '.html'
};

const ErrorMessages = {
    Import: (statement) => { return `Invalid uppercase character: ${statement}` }
}

let gExceptions = undefined;
let gBasePath = undefined;

const PathMatchesExceptions = (filePath) => {
    let pathComponents = filePath.split('/');
    for (let i = 0; i < pathComponents.length; ++i) {
        let component = pathComponents[i];
        if (component.toLowerCase() !== component && gExceptions.indexOf(component) === -1) {
            return false;
        }
    }
    return true;
};

function lintFile (content, fileName, fileExtension, errorHandler) {
    fileName = path.normalize(fileName);

    let lines = content.split('\n');

    // Javascript file, look for `import`.
    if (fileExtension === FileExt.JS) {
        for(let i = 0; i < lines.length; ++i) {
            let line = lines[i];

            // Scan for imports.
            const components = line.split(' ');
            // Scan until first ', ", `
            if (components[0] === 'import') {
                let lineContainsPath = false;
                let scannedCharacter = undefined;
                while (!lineContainsPath) {
                    if (line.indexOf('\'') !== -1) {
                        scannedCharacter = '\'';
                        lineContainsPath = true;
                    } else if (line.indexOf('\`') !== -1) {
                        scannedCharacter = '\`';
                        lineContainsPath = true;
                    } else if (line.indexOf('\"') !== -1) {
                        scannedCharacter = '\"';
                        lineContainsPath = true;
                    } else {
                        i++;
                        if (i >= lines.length) {
                            return;
                        }
                        line = lines[i];
                    }
                }
                let scannedCharacterIndex = line.indexOf(scannedCharacter);
                let path = line.slice(scannedCharacterIndex + 1);
                path = path.slice(0, path.indexOf(scannedCharacter));
                path = path.replace(/\r?\n|\r/, '');

                if (path) {
                    if (path.toLowerCase() !== path && !PathMatchesExceptions(path)) {
                        errorHandler({ 
                            message: ErrorMessages.Import(path),
                            line: i + 1
                        }, `${fileName.replace(gBasePath, '').replace(/\\/g, "/")}`);                    }
                }
            }

            // Scan for requires
            let requireIndex = line.indexOf('require(\'');
            if (requireIndex === -1) requireIndex = line.indexOf('require(\`');
            if (requireIndex === -1) requireIndex = line.indexOf('require(\"');
            if (requireIndex !== -1) {
                slicedPath = line.slice(requireIndex);
                let includeString = slicedPath.slice(slicedPath.indexOf('('), slicedPath.indexOf(')'));
                includeString = includeString.replace('require', '')
                    .replace('(', '')
                    .replace(')', '')
                    .replace(';', '');

                if(includeString.toLowerCase() !== includeString && !PathMatchesExceptions(includeString)) {
                    errorHandler({ 
                        message: ErrorMessages.Import(includeString),
                        line: i + 1
                    }, `${fileName.replace(gBasePath, '').replace(/\\/g, "/")}`);                }
            }
        }
    }

    // HTML file, look for `require` tag.
    else if (fileExtension === FileExt.Html) {
        for(let i = 0; i < lines.length; ++i) {
            let line = lines[i];

            // Scan for imports.
            const components = line.split(' ');
            // Scan until first ', ", `
            if (components[0] === '<require') {
                let slicedPath = line.slice(line.indexOf('<require'));
                let openPathIndex = slicedPath.indexOf('\'');
                let scannedCharacter = '\'';

                if (openPathIndex !== -1) {
                    openPathIndex = slicedPath.indexOf('\`');
                    scannedCharacter = '\`';
                }

                if (openPathIndex === -1) {
                    openPathIndex = slicedPath.indexOf('\"');
                    scannedCharacter = '\"';
                }

                if (openPathIndex === -1) {
                    return;
                }

                slicedPath = slicedPath.slice(openPathIndex + 1);
                slicedPath = slicedPath.slice(0, slicedPath.indexOf(scannedCharacter));
                slicedPath.replace('"', '');
                if (slicedPath.toLowerCase() !== slicedPath && !PathMatchesExceptions(slicedPath)) {
                    errorHandler({ 
                        message: ErrorMessages.Import(slicedPath),
                        line: i + 1
                    }, `${fileName.replace(gBasePath, '').replace(/\\/g, "/")}`);
                }
            }
        }
    }
};

function importLint(config, errorHandler, basePath) {
    gExceptions = config && config.exceptions ? config.exceptions : [];
    gBasePath = basePath;
    return through.obj(function(file, enc, callback) {
        if (file.isBuffer() && [FileExt.Html, FileExt.JS].indexOf(path.extname(file.path)) !== -1) {
            lintFile(file.contents.toString(), file.path, path.extname(file.path), errorHandler);
        }
        return callback();
    });
}

module.exports = importLint;