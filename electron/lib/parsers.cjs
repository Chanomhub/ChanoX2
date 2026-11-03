// Pure parsing/serialization helpers extracted from main.cjs so node --test
// can cover them without booting Electron.
const fs = require('fs');

// Parse command line arguments for game launch
function parseLaunchGameArg(args) {
    const launchArg = args.find(arg => arg.startsWith('--launch-game='));
    // slice after "--launch-game=" so paths containing '=' survive
    return launchArg ? launchArg.slice('--launch-game='.length) : null;
}

// Parse command line arguments for protocol URL
function parseProtocolUrl(args) {
    // Find any argument that contains chanox2://
    const protocolArg = args.find(arg => arg.includes('chanox2://'));
    if (protocolArg) {
        // Extract the actual URL (in case it's part of a larger string)
        const match = protocolArg.match(/chanox2:\/\/[^\s"]+/);
        return match ? match[0] : protocolArg;
    }
    return null;
}

function loadJsonFile(filePath, defaultValue = {}) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch (e) {
        console.error(`Failed to load ${filePath}:`, e);
    }
    return defaultValue;
}

function saveJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`Failed to save ${filePath}:`, e);
        return false;
    }
}

// Minimal INI read/write (Qt QSettings IniFormat compatible for flat sections)
function parseIni(text) {
    const out = {};
    let section = null;
    for (const line of (text || '').split(/\r?\n/)) {
        const m = line.match(/^\[(.+)\]\s*$/);
        if (m) { section = m[1]; out[section] = {}; continue; }
        const kv = line.match(/^([^=]+)=(.*)$/);
        if (kv && section) out[section][kv[1].trim()] = kv[2];
    }
    return out;
}

function serializeIni(ini) {
    return Object.entries(ini).map(([sec, kvs]) =>
        `[${sec}]\n` + Object.entries(kvs).map(([k, v]) => `${k}=${v}`).join('\n')
    ).join('\n\n') + '\n';
}

module.exports = { parseLaunchGameArg, parseProtocolUrl, loadJsonFile, saveJsonFile, parseIni, serializeIni };
