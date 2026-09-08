const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BLACKLISTED_KEYS = new Set([
    'se', 'bgm', 'bgs', 'me',
    'animation1Name', 'animation2Name', 'battlerName',
    'characterName', 'faceName', 'motion',
    'overlay1Name', 'overlay2Name', 'tileset',
    'parallaxName', 'battleback1Name', 'battleback2Name',
    'script', 'url'
]);

/**
 * Service for applying and rolling back translation patches (.patch.json.gz / .patch.json)
 */
class PatcherService {
    /**
     * Parse path string like "events[15].pages[0].list[2].parameters[0]" or "[10].name"
     */
    static parsePath(pathStr) {
        const tokens = [];
        const re = /([^\.\[\]]+)|\[(\d+)\]/g;
        let match;
        while ((match = re.exec(pathStr)) !== null) {
            if (match[2] !== undefined) {
                tokens.push(parseInt(match[2], 10));
            } else if (match[1] !== undefined) {
                tokens.push(match[1]);
            }
        }
        return tokens;
    }

    /**
     * Safely mutate an object at given tokens path if source text matches or is expected
     */
    static setPathValue(obj, tokens, value, expectedSource) {
        if (!obj || !tokens || tokens.length === 0) return false;
        let curr = obj;
        for (let i = 0; i < tokens.length - 1; i++) {
            const token = tokens[i];
            if (curr === null || curr === undefined || typeof curr !== 'object') {
                return false;
            }
            curr = curr[token];
        }
        if (curr !== null && curr !== undefined && typeof curr === 'object') {
            const lastToken = tokens[tokens.length - 1];
            if (expectedSource !== undefined && curr[lastToken] !== expectedSource) {
                return false;
            }
            curr[lastToken] = value;
            return true;
        }
        return false;
    }

    /**
     * Load and parse a patch package (.patch.json or .patch.json.gz)
     */
    static loadPatch(patchPath) {
        if (!fs.existsSync(patchPath)) {
            throw new Error(`Patch file not found: ${patchPath}`);
        }
        const fileBuffer = fs.readFileSync(patchPath);
        let jsonStr;
        if (fileBuffer.length >= 2 && fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b) {
            jsonStr = zlib.gunzipSync(fileBuffer).toString('utf-8');
        } else {
            jsonStr = fileBuffer.toString('utf-8');
        }
        return JSON.parse(jsonStr);
    }

    /**
     * Locate data and fonts directory in game directory
     */
    static findGameDirs(gameDir) {
        let dataDir = null;
        let fontsDir = null;

        if (fs.existsSync(path.join(gameDir, 'www', 'data'))) {
            dataDir = path.join(gameDir, 'www', 'data');
        } else if (fs.existsSync(path.join(gameDir, 'data'))) {
            dataDir = path.join(gameDir, 'data');
        } else {
            const entries = fs.readdirSync(gameDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subWwwData = path.join(gameDir, entry.name, 'www', 'data');
                    const subData = path.join(gameDir, entry.name, 'data');
                    if (fs.existsSync(subWwwData)) {
                        dataDir = subWwwData;
                        break;
                    } else if (fs.existsSync(subData)) {
                        dataDir = subData;
                        break;
                    }
                }
            }
        }

        if (fs.existsSync(path.join(gameDir, 'www', 'fonts'))) {
            fontsDir = path.join(gameDir, 'www', 'fonts');
        } else if (fs.existsSync(path.join(gameDir, 'fonts'))) {
            fontsDir = path.join(gameDir, 'fonts');
        }

        return { dataDir, fontsDir };
    }

    /**
     * Walk JSON tree and apply dictionary translations for shifted/reordered dialogue
     */
    static applyDictionaryWalk(node, dict) {
        if (!node || typeof node !== 'object') return 0;
        let count = 0;

        // Check RPG Maker Event command
        if (node.code !== undefined && Array.isArray(node.parameters)) {
            const code = node.code;
            const params = node.parameters;

            // CodeShowTextLine (401), CodeShowScrollingText (105), CodeShowScrollingTextLine (405)
            if (code === 401 || code === 105 || code === 405) {
                if (typeof params[0] === 'string' && dict.has(params[0])) {
                    params[0] = dict.get(params[0]);
                    count++;
                }
            } else if (code === 102) {
                // Choices
                if (Array.isArray(params[0])) {
                    for (let i = 0; i < params[0].length; i++) {
                        if (typeof params[0][i] === 'string' && dict.has(params[0][i])) {
                            params[0][i] = dict.get(params[0][i]);
                            count++;
                        }
                    }
                }
            } else if (code === 101) {
                // Speaker name (MZ parameter index 4)
                if (params.length > 4 && typeof params[4] === 'string' && dict.has(params[4])) {
                    params[4] = dict.get(params[4]);
                    count++;
                }
            } else if (code === 320 || code === 324) {
                // Change Name / Nickname
                if (params.length > 1 && typeof params[1] === 'string' && dict.has(params[1])) {
                    params[1] = dict.get(params[1]);
                    count++;
                }
            }
            return count;
        }

        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                if (typeof node[i] === 'string') {
                    if (dict.has(node[i])) {
                        node[i] = dict.get(node[i]);
                        count++;
                    }
                } else if (typeof node[i] === 'object') {
                    count += this.applyDictionaryWalk(node[i], dict);
                }
            }
            return count;
        }

        for (const [key, val] of Object.entries(node)) {
            if (BLACKLISTED_KEYS.has(key)) continue;
            if (typeof val === 'string') {
                if (dict.has(val)) {
                    node[key] = dict.get(val);
                    count++;
                }
            } else if (typeof val === 'object') {
                count += this.applyDictionaryWalk(val, dict);
            }
        }

        return count;
    }

    /**
     * Apply patch to game
     */
    static async applyPatch({ gamePath, patchPath, modId }) {
        console.log(`[Patcher] Applying patch ${patchPath} to ${gamePath} (modId: ${modId})`);
        
        const pkg = this.loadPatch(patchPath);
        if (!pkg.entries || !Array.isArray(pkg.entries)) {
            throw new Error('Invalid patch package: missing or invalid entries list');
        }

        const { dataDir, fontsDir } = this.findGameDirs(gamePath);
        if (!dataDir) {
            throw new Error(`Could not locate game data directory in ${gamePath}`);
        }

        // Prepare backup directory
        const timestamp = Date.now();
        const backupId = `mod_${modId}_${timestamp}`;
        const backupDir = path.join(gamePath, '.chanox2', 'backups', backupId);
        fs.mkdirSync(backupDir, { recursive: true });

        // Group patch entries by file and build dictionary for fallback
        const entriesByFile = new Map();
        const fileDicts = new Map();
        const globalDict = new Map();

        for (const entry of pkg.entries) {
            if (!entry.tgt || entry.tgt === entry.src) continue;
            const fileName = path.basename(entry.file);
            if (!entriesByFile.has(fileName)) {
                entriesByFile.set(fileName, []);
                fileDicts.set(fileName, new Map());
            }
            entriesByFile.get(fileName).push(entry);
            fileDicts.get(fileName).set(entry.src, entry.tgt);
            globalDict.set(entry.src, entry.tgt);
        }

        const backedUpFiles = [];
        const patchedFiles = [];
        let totalPatchedEntries = 0;

        // Patch each data file
        for (const [fileName, fileEntries] of entriesByFile.entries()) {
            const targetFilePath = path.join(dataDir, fileName);
            if (!fs.existsSync(targetFilePath)) {
                console.warn(`[Patcher] Target file not found, skipping: ${targetFilePath}`);
                continue;
            }

            // Backup original file
            const backupFilePath = path.join(backupDir, fileName);
            fs.copyFileSync(targetFilePath, backupFilePath);
            backedUpFiles.push({
                originalPath: targetFilePath,
                backupPath: backupFilePath,
                fileName: fileName
            });

            // Read, modify, write
            const originalContent = fs.readFileSync(targetFilePath, 'utf-8');
            let jsonRoot;
            try {
                jsonRoot = JSON.parse(originalContent);
            } catch (err) {
                console.error(`[Patcher] Failed to parse JSON file ${targetFilePath}:`, err);
                continue;
            }

            let filePatchedCount = 0;
            const unappliedEntries = [];

            // Pass 1: Exact Key-Path Match
            for (const entry of fileEntries) {
                const tokens = this.parsePath(entry.key);
                if (this.setPathValue(jsonRoot, tokens, entry.tgt, entry.src)) {
                    filePatchedCount++;
                } else {
                    unappliedEntries.push(entry);
                }
            }

            // Pass 2: Dictionary Fallback for shifted lines/events
            if (unappliedEntries.length > 0) {
                const fallbackDict = new Map();
                for (const unapplied of unappliedEntries) {
                    fallbackDict.set(unapplied.src, unapplied.tgt);
                }
                const dictMatchedCount = this.applyDictionaryWalk(jsonRoot, fallbackDict);
                filePatchedCount += dictMatchedCount;
            }

            // Write patched JSON
            fs.writeFileSync(targetFilePath, JSON.stringify(jsonRoot, null, 2), 'utf-8');
            patchedFiles.push(fileName);
            totalPatchedEntries += filePatchedCount;
        }

        // Setup Thai Font if fontsDir exists
        let fontInjected = false;
        if (fontsDir && fs.existsSync(fontsDir)) {
            try {
                const bundledFontPath = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansThai-Regular.ttf');
                const targetFontPath = path.join(fontsDir, 'NotoSansThai-Regular.ttf');
                const gameFontCssPath = path.join(fontsDir, 'gamefont.css');

                if (fs.existsSync(bundledFontPath)) {
                    fs.copyFileSync(bundledFontPath, targetFontPath);

                    if (fs.existsSync(gameFontCssPath)) {
                        // Backup gamefont.css
                        const backupCssPath = path.join(backupDir, 'gamefont.css');
                        fs.copyFileSync(gameFontCssPath, backupCssPath);
                        backedUpFiles.push({
                            originalPath: gameFontCssPath,
                            backupPath: backupCssPath,
                            fileName: 'gamefont.css'
                        });

                        let cssContent = fs.readFileSync(gameFontCssPath, 'utf-8');
                        if (!cssContent.includes('NotoSansThai-Regular.ttf')) {
                            cssContent = cssContent.replace(
                                /src:\s*url\(["']?([^"')]+)["']?\);?/i,
                                'src: url("NotoSansThai-Regular.ttf"), url("$1");'
                            );
                            fs.writeFileSync(gameFontCssPath, cssContent, 'utf-8');
                        }
                    }
                    fontInjected = true;
                }
            } catch (err) {
                console.error('[Patcher] Failed to setup Thai font:', err);
            }
        }

        // Save manifest
        const manifest = {
            modId,
            backupId,
            timestamp,
            gamePath,
            patchPath,
            backedUpFiles,
            patchedFiles,
            totalPatchedEntries,
            fontInjected
        };
        fs.writeFileSync(path.join(backupDir, 'backup-manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

        console.log(`[Patcher] Successfully patched ${totalPatchedEntries} entries across ${patchedFiles.length} files. Backup: ${backupId}`);

        return {
            success: true,
            backupId,
            totalPatchedEntries,
            filesModified: patchedFiles.length,
            fontInjected
        };
    }

    /**
     * Rollback a previously applied patch
     */
    static async rollbackPatch({ gamePath, backupId }) {
        console.log(`[Patcher] Rolling back backup ${backupId} in ${gamePath}`);
        const backupDir = path.join(gamePath, '.chanox2', 'backups', backupId);
        const manifestPath = path.join(backupDir, 'backup-manifest.json');

        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Backup manifest not found: ${manifestPath}`);
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        // Restore backed up files
        for (const item of manifest.backedUpFiles || []) {
            if (fs.existsSync(item.backupPath)) {
                fs.copyFileSync(item.backupPath, item.originalPath);
                console.log(`[Patcher] Restored ${item.originalPath}`);
            }
        }

        // Clean up injected font if present
        if (manifest.fontInjected) {
            const { fontsDir } = this.findGameDirs(gamePath);
            if (fontsDir) {
                const injectedFontPath = path.join(fontsDir, 'NotoSansThai-Regular.ttf');
                if (fs.existsSync(injectedFontPath)) {
                    try {
                        fs.unlinkSync(injectedFontPath);
                    } catch (e) {
                        // ignore
                    }
                }
            }
        }

        fs.renameSync(manifestPath, manifestPath + '.rolledback');
        console.log(`[Patcher] Rollback completed for ${backupId}`);

        return { success: true };
    }

    /**
     * Get list of backups for a mod
     */
    static getModBackups({ gamePath, modId }) {
        const rootBackupDir = path.join(gamePath, '.chanox2', 'backups');
        if (!fs.existsSync(rootBackupDir)) return [];

        const dirs = fs.readdirSync(rootBackupDir);
        const backups = [];

        for (const dirName of dirs) {
            if (dirName.startsWith(`mod_${modId}_`)) {
                const manifestPath = path.join(rootBackupDir, dirName, 'backup-manifest.json');
                if (fs.existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                        backups.push({
                            id: dirName,
                            timestamp: manifest.timestamp,
                            fileCount: (manifest.backedUpFiles || []).length,
                            patchedEntries: manifest.totalPatchedEntries || 0,
                            fontInjected: manifest.fontInjected || false
                        });
                    } catch (e) {
                        // ignore malformed
                    }
                }
            }
        }
        return backups.sort((a, b) => b.timestamp - a.timestamp);
    }
}

module.exports = PatcherService;
