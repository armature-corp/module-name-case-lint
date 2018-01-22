#!/usr/bin/env node

const dir = require('node-dir');
const args = require('args');
const resolve = require('path').resolve;

const constants = {
    js_fileExtension: 'js',
    html_fileExtension: 'html'
};

args.option('directory', 'The directory on which this tool will be run.');

const flags = args.parse(process.argv);

let errors = [];

const fileCallback = function (err, content, filename, next) {
    let lines = content.split('\n');

    // Javascript file, look for `import`.
    if (filename.split('.').slice(-1)[0] === constants.js_fileExtension) {
        for(let i = 0; i < lines.length; ++i) {
            let line = lines[i];
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
                let path = line.slice(-1 * (line.length - scannedCharacterIndex));

                if (path) {
                    if (path.toLowerCase() !== path) {
                        errors.push(` ${path} .${filename.replace(resolve(flags.directory), '').replace(/\\/g, "/")} ln: ${i}`);
                    }
                }
            }
        }
    }

    // HTML file, look for `require` tag.
    if (filename.split('.').slice(-1)[0] === constants.html_fileExtension) {
        for(let line in lines) {

        }
    }

    next();
};

const displayErrors = () => {
    if (errors.length <= 0) {
        return;
    }

    let err = '';

    err += 'Paths should not contain uppercase characters:';
    for(let i = 0; i < errors.length; ++i) {
        const error = errors[i];
        err += `\n  ${error}`;
    }

    console.log(err);
};

dir.readFiles(resolve(flags.directory),
    {
        exclude: /^\./
    },
    fileCallback,
    displayErrors);