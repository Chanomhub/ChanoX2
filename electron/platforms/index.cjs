const linux = require('./linux.cjs');
const macos = require('./macos.cjs');
const windows = require('./windows.cjs');

const platform = process.platform;

let selected;

if (platform === 'win32') {
    selected = windows;
} else if (platform === 'darwin') {
    selected = macos;
} else {
    // Default to linux for others
    selected = linux;
}

module.exports = selected;
