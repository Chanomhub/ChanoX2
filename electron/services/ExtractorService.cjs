/**
 * ExtractorService - Native OS Extraction Tools
 * Uses native extraction commands instead of bundled 7zip-bin
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const platform = process.platform;

// Installation instructions per platform
const INSTALL_INSTRUCTIONS = {
    win32: {
        '7z': 'กรุณาติดตั้ง 7-Zip:\n1. ดาวน์โหลดจาก https://www.7-zip.org/\n2. ติดตั้งแล้วเปิดแอปใหม่',
    },
    linux: {
        '7z': 'กรุณาติดตั้ง p7zip:\n- Ubuntu/Debian: sudo apt install p7zip-full\n- Fedora: sudo dnf install p7zip p7zip-plugins\n- Arch: sudo pacman -S p7zip',
        unrar: 'กรุณาติดตั้ง unrar:\n- Ubuntu/Debian: sudo apt install unrar\n- Fedora: sudo dnf install unrar\n- Arch: sudo pacman -S unrar',
        unzip: 'กรุณาติดตั้ง unzip:\n- Ubuntu/Debian: sudo apt install unzip\n- Fedora: sudo dnf install unzip\n- Arch: sudo pacman -S unzip',
    },
    darwin: {
        '7z': 'กรุณาติดตั้ง p7zip ผ่าน Homebrew:\nbrew install p7zip',
        unrar: 'กรุณาติดตั้ง unrar ผ่าน Homebrew:\nbrew install unrar',
    },
};

/**
 * Check if a command exists in system PATH
 */
function commandExists(cmd) {
    try {
        const checkCmd = platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
        execSync(checkCmd, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the path to 7z executable
 * Windows: Check common installation paths
 * Linux/macOS: Use 7z from PATH
 */
function get7zPath() {
    if (platform === 'win32') {
        // Check common Windows paths
        const commonPaths = [
            'C:\\Program Files\\7-Zip\\7z.exe',
            'C:\\Program Files (x86)\\7-Zip\\7z.exe',
        ];
        for (const p of commonPaths) {
            if (fs.existsSync(p)) return p;
        }
        // Check PATH
        if (commandExists('7z')) return '7z';
        return null;
    }
    // Linux/macOS
    return commandExists('7z') ? '7z' : null;
}

/**
 * Check available extraction tools on the system
 */
function checkExtractionTools() {
    const tools = {
        zip: false,
        '7z': false,
        rar: false,
        tar: true, // tar is always available on Unix-like systems
        missingInstructions: [],
    };

    if (platform === 'win32') {
        // Windows always has PowerShell for ZIP
        tools.zip = true;
        tools.tar = commandExists('tar'); // Windows 10+ has tar

        const sevenZipPath = get7zPath();
        tools['7z'] = !!sevenZipPath;
        tools.rar = tools['7z']; // 7z can extract RAR on Windows

        if (!tools['7z']) {
            tools.missingInstructions.push({
                tool: '7z',
                formats: ['.7z', '.rar'],
                instruction: INSTALL_INSTRUCTIONS.win32['7z'],
            });
        }
    } else if (platform === 'linux') {
        tools.zip = commandExists('unzip');
        tools['7z'] = commandExists('7z');
        tools.rar = commandExists('unrar') || tools['7z'];

        if (!tools.zip && !tools['7z']) {
            tools.missingInstructions.push({
                tool: 'unzip',
                formats: ['.zip'],
                instruction: INSTALL_INSTRUCTIONS.linux.unzip,
            });
        }
        if (!tools['7z']) {
            tools.missingInstructions.push({
                tool: '7z',
                formats: ['.7z'],
                instruction: INSTALL_INSTRUCTIONS.linux['7z'],
            });
        }
        if (!tools.rar) {
            tools.missingInstructions.push({
                tool: 'unrar',
                formats: ['.rar'],
                instruction: INSTALL_INSTRUCTIONS.linux.unrar,
            });
        }
    } else if (platform === 'darwin') {
        // macOS has ditto and unzip built-in
        tools.zip = true;
        tools['7z'] = commandExists('7z');
        tools.rar = commandExists('unrar') || tools['7z'];

        if (!tools['7z']) {
            tools.missingInstructions.push({
                tool: '7z',
                formats: ['.7z'],
                instruction: INSTALL_INSTRUCTIONS.darwin['7z'],
            });
        }
        if (!tools.rar) {
            tools.missingInstructions.push({
                tool: 'unrar',
                formats: ['.rar'],
                instruction: INSTALL_INSTRUCTIONS.darwin.unrar,
            });
        }
    }

    return tools;
}

// ============= Extraction Functions =============

/**
 * Extract using PowerShell Expand-Archive (Windows ZIP only)
 */
function extractWithPowerShell(filePath, destPath) {
    return new Promise((resolve, reject) => {
        const ps = spawn('powershell', [
            '-NoProfile',
            '-Command',
            `Expand-Archive -Path '${filePath}' -DestinationPath '${destPath}' -Force`
        ], { stdio: ['ignore', 'pipe', 'pipe'] });

        let stderr = '';
        ps.stderr.on('data', (data) => { stderr += data.toString(); });

        ps.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`PowerShell extraction failed: ${stderr}`));
        });

        ps.on('error', reject);
    });
}

/**
 * Extract using 7z command
 */
function extractWith7z(filePath, destPath) {
    return new Promise((resolve, reject) => {
        const sevenZipPath = get7zPath();
        if (!sevenZipPath) {
            const instructions = INSTALL_INSTRUCTIONS[platform]?.['7z'] || 'Please install 7-Zip';
            reject(new Error(`7-Zip not found.\n\n${instructions}`));
            return;
        }

        const proc = spawn(sevenZipPath, ['x', '-y', `-o${destPath}`, filePath], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderr = '';
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`7z extraction failed (code ${code}): ${stderr}`));
        });

        proc.on('error', reject);
    });
}

/**
 * Extract using unrar command (Linux/macOS)
 */
function extractWithUnrar(filePath, destPath) {
    return new Promise((resolve, reject) => {
        const proc = spawn('unrar', ['x', '-o+', '-y', filePath, destPath + '/'], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderr = '';
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`unrar extraction failed (code ${code}): ${stderr}`));
        });

        proc.on('error', (err) => {
            if (err.code === 'ENOENT') {
                const instructions = INSTALL_INSTRUCTIONS[platform]?.unrar || 'Please install unrar';
                reject(new Error(`unrar not found.\n\n${instructions}`));
            } else {
                reject(err);
            }
        });
    });
}

/**
 * Extract using unzip command (Linux)
 */
function extractWithUnzip(filePath, destPath) {
    return new Promise((resolve, reject) => {
        const proc = spawn('unzip', ['-o', '-q', filePath, '-d', destPath], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderr = '';
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`unzip extraction failed (code ${code}): ${stderr}`));
        });

        proc.on('error', (err) => {
            if (err.code === 'ENOENT') {
                const instructions = INSTALL_INSTRUCTIONS[platform]?.unzip || 'Please install unzip';
                reject(new Error(`unzip not found.\n\n${instructions}`));
            } else {
                reject(err);
            }
        });
    });
}

/**
 * Extract using ditto command (macOS built-in, preserves attributes)
 */
function extractWithDitto(filePath, destPath) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ditto', ['-xk', filePath, destPath], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderr = '';
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ditto extraction failed (code ${code}): ${stderr}`));
        });

        proc.on('error', reject);
    });
}

/**
 * Extract using tar command (Linux/macOS, Windows 10+)
 */
function extractWithTar(filePath, destPath) {
    return new Promise((resolve, reject) => {
        // Detect compression type
        const lowerPath = filePath.toLowerCase();
        let flags = '-xf';
        if (lowerPath.endsWith('.tar.gz') || lowerPath.endsWith('.tgz')) {
            flags = '-xzf';
        } else if (lowerPath.endsWith('.tar.xz')) {
            flags = '-xJf';
        } else if (lowerPath.endsWith('.tar.bz2')) {
            flags = '-xjf';
        }

        const proc = spawn('tar', [flags, filePath, '-C', destPath], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderr = '';
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`tar extraction failed (code ${code}): ${stderr}`));
        });

        proc.on('error', reject);
    });
}

// ============= Main Extract Function =============

/**
 * Extract archive file using appropriate native tool
 * @param {string} filePath - Path to archive file
 * @param {string} destPath - Destination directory
 * @returns {Promise<void>}
 */
async function extractArchive(filePath, destPath) {
    const lowerPath = filePath.toLowerCase();

    // Ensure destination exists
    if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
    }

    // Handle TAR archives
    if (lowerPath.endsWith('.tar') ||
        lowerPath.endsWith('.tar.gz') ||
        lowerPath.endsWith('.tgz') ||
        lowerPath.endsWith('.tar.xz') ||
        lowerPath.endsWith('.tar.bz2')) {
        await extractWithTar(filePath, destPath);
        return;
    }

    // Handle ZIP archives
    if (lowerPath.endsWith('.zip')) {
        if (platform === 'win32') {
            await extractWithPowerShell(filePath, destPath);
        } else if (platform === 'darwin') {
            await extractWithDitto(filePath, destPath);
        } else {
            // Linux: try unzip first, fallback to 7z
            if (commandExists('unzip')) {
                await extractWithUnzip(filePath, destPath);
            } else {
                await extractWith7z(filePath, destPath);
            }
        }
        return;
    }

    // Handle RAR archives
    if (lowerPath.endsWith('.rar')) {
        // Try unrar first on Unix systems
        if (platform !== 'win32' && commandExists('unrar')) {
            try {
                await extractWithUnrar(filePath, destPath);
                return;
            } catch (err) {
                console.log('unrar failed, trying 7z:', err.message);
            }
        }
        // Fallback to 7z
        await extractWith7z(filePath, destPath);
        return;
    }

    // Handle 7z and other formats (iso, etc.) - use 7z
    await extractWith7z(filePath, destPath);
}

/**
 * Find game folder after extraction (look for game markers)
 */
function findGameFolder(dir, depth = 0) {
    if (depth > 3) return null;

    try {
        const items = fs.readdirSync(dir);

        // Check if this folder contains game files
        const gameMarkers = [
            'Game.exe', 'game.exe', 'Game.app',
            'package.json', // RPG Maker MV/MZ
            'data', 'www', 'js', // RPG Maker folders
            'rgss3a', 'RGSS3A', // RPG Maker VX Ace
            'rgss2a', 'RGSS2A', // RPG Maker VX
            'Game.rgss3a', 'Game.rgss2a',
            'nw.pak', 'nwjs.pak' // NW.js games
        ];

        for (const item of items) {
            if (gameMarkers.includes(item)) {
                console.log('🎮 [ExtractorService] Game marker found:', item, 'in', dir);
                return dir;
            }
        }

        // If no game files found, check subfolders
        const visibleFolders = items
            .filter(item => !item.startsWith('.'))
            .map(item => path.join(dir, item))
            .filter(itemPath => {
                try {
                    return fs.statSync(itemPath).isDirectory();
                } catch { return false; }
            });

        for (const folder of visibleFolders) {
            const result = findGameFolder(folder, depth + 1);
            if (result) return result;
        }
    } catch (err) {
        console.warn('[ExtractorService] Could not scan folder:', err.message);
    }

    return null;
}

/**
 * Full extraction with post-processing (game folder detection)
 */
async function extractFile(filePath, destPath) {
    await extractArchive(filePath, destPath);

    // Smart game folder detection
    let actualPath = destPath;
    try {
        const gameFolder = findGameFolder(destPath);
        if (gameFolder && gameFolder !== destPath) {
            console.log('[ExtractorService] Game folder detected:', gameFolder);
            actualPath = gameFolder;
        }
    } catch (scanErr) {
        console.warn('[ExtractorService] Could not scan for game folder:', scanErr.message);
    }

    return { success: true, actualPath };
}

module.exports = {
    checkExtractionTools,
    extractFile,
    extractArchive,
    findGameFolder,
    commandExists,
    get7zPath,
};
