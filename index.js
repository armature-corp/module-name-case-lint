const dir = require('node-dir');
const resolve = require('path').resolve;

const constants = {
    js_fileExtension: 'js',
    html_fileExtension: 'html'
};

let gDirectory = undefined;
let gExceptions = undefined;

let js_import_errors = [];
let js_require_errors = [];
let html_require_errors = [];

const PathMatchesExceptions = (path) => {
    let pathComponents = path.split('/');
    for (let i = 0; i < pathComponents.length; ++i) {
        let component = pathComponents[i];
        if (component.toLowerCase() !== component && gExceptions.indexOf(component) === -1) {
            return false;
        }
    }
    return true;
};

const fileCallback = function (err, content, filename, next) {
    let lines = content.split('\n');

    // Javascript file, look for `import`.
    if (filename.split('.').slice(-1)[0] === constants.js_fileExtension) {
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
                        js_import_errors.push(`${path} => .${filename.replace(resolve(gDirectory), '').replace(/\\/g, "/")} ln: ${i + 1}`);
                    }
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
                    js_require_errors.push(`${includeString} => .${filename.replace(resolve(gDirectory), '').replace(/\\/g, "/")} ln: ${i + 1}`);
                }
            }
        }
    }

    // HTML file, look for `require` tag.
    else if (filename.split('.').slice(-1)[0] === constants.html_fileExtension) {
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
                    html_require_errors.push(`${slicedPath} => .${filename.replace(resolve(gDirectory), '').replace(/\\/g, "/")} ln: ${i + 1}`);
                }
            }
        }
    }

    next();
};

const displayErrors = () => {
    let err = '';

    if (js_import_errors.length > 0) {
        // JS imports
        err += 'JS - Import paths should not contain uppercase characters:';
        for(let i = 0; i < js_import_errors.length; ++i) {
            const error = js_import_errors[i];
            err += `\n  ${error}`;
        }

        console.log(err + '\n');
    }

    if (js_require_errors.length > 0) {
        // JS requires
        err = 'JS - Require paths should not contain uppercase characters:';
        for(let i = 0; i < js_require_errors.length; ++i) {
            const error = js_require_errors[i];
            err += `\n  ${error}`;
        }

        console.log(err + '\n');
    }

    if (html_require_errors.length > 0) {
        // JS requires
        err = 'HTML - Require paths should not contain uppercase characters:';
        for(let i = 0; i < html_require_errors.length; ++i) {
            const error = html_require_errors[i];
            err += `\n  ${error}`;
        }

        console.log(err + '\n');
    }
};


function start(config) {
    if (config && config.directory) {
        gDirectory = config.directory;
        gExceptions = config.exceptions;
        dir.readFiles(resolve(config.directory),
        {
            exclude: /^\./
        },
        fileCallback,
        displayErrors);
    }
}

module.exports = start;