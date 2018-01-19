var dir = require('node-dir');
var args = require('args');

args.option('directory', 'The directory on which this tool will be run.')

const flags = args.parse(process.argv);

const fileCallback = (contents) => {
    console.log(contents);
}

dir.readFiles(flags.directory, fileCallback, null);