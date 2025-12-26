const path = require('path');
const fs = require('fs');

/**
 * Linux Platform Implementation
 */
module.exports = {
    /**
     * Get path for desktop shortcut
     */
    getShortcutPath(app, title) {
        // Sanitize title
        const safeName = title
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 80);

        return path.join(app.getPath('home'), 'Desktop', `${safeName}.desktop`);
    },

    /**
     * Prepare launch command and arguments
     */
    prepareLaunch(executablePath, args, { useWine, wineProvider, globalSettings }) {
        let command = executablePath;
        let finalArgs = args;
        let detached = false;

        // Auto-detect native Linux binaries to prevent accidental Wine launch
        const lower = executablePath.toLowerCase();
        const isNative = lower.endsWith('.appimage') ||
            lower.endsWith('.x86_64') ||
            lower.endsWith('.x86') ||
            lower.endsWith('.sh') || // Ren'Py / Shell scripts
            (lower.indexOf('.') === -1 && !useWine); // No extension, likely binary

        // If explicitly native, disable Wine
        const shouldRunWine = isNative ? false : useWine;

        if (shouldRunWine) {
            if (wineProvider === 'bottles') {
                const customCmd = globalSettings.externalWineCommand || 'bottles-cli run -b Gaming -e %EXE%';
                let cmdString = customCmd.replace('%EXE%', `"${executablePath}"`);
                if (!customCmd.includes('%EXE%')) cmdString = `${customCmd} "${executablePath}"`;

                // Command parsing
                const parts = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < cmdString.length; i++) {
                    const char = cmdString[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ' ' && !inQuotes) {
                        if (current.length > 0) parts.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
                if (current.length > 0) parts.push(current);

                if (parts.length > 0) {
                    command = parts[0];
                    finalArgs = [...parts.slice(1), ...args];
                }
            } else {
                command = 'wine';
                finalArgs = [executablePath, ...args];
                detached = true; // Detach for wine
            }
        } else {
            // Native launch
            detached = true; // Ideally detach

            // For AppImages, we might need no-sandbox if it causes issues, but standard is just run it.
            // Some AppImages need specific args, but usually not.
        }

        return { command, finalArgs, detached };
    },

    /**
     * Check if a file is a valid game executable
     */
    isGameExecutable(file, stats) {
        const lower = file.toLowerCase();
        // Check if executable bit is set (0o100)
        const isExecutable = !!(stats.mode & 0o100);

        // Exclude common non-game extensions
        const ignoredExts = [
            '.sh', '.so', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico',
            '.json', '.xml', '.html', '.css', '.js', '.ts', '.md', '.markdown',
            '.config', '.cfg', '.ini', '.log', '.dat', '.db', '.sqlite',
            '.mp3', '.wav', '.ogg', '.mp4', '.mkv', '.avi', '.mov',
            '.zip', '.rar', '.7z', '.tar', '.gz', '.xz', '.pdf', '.doc', '.docx'
        ];
        const hasIgnoredExt = ignoredExts.some(ext => lower.endsWith(ext));

        // Accept if:
        // 1. Is executable AND not ignored
        // 2. Known binary extension (.x86_64, .x86, .appimage, .bin)
        // 3. NO extension AND not ignored (likely a linux binary like "godot_game")
        const hasNoExtension = !lower.includes('.');

        if ((isExecutable && !hasIgnoredExt) ||
            lower.endsWith('.x86_64') ||
            lower.endsWith('.x86') ||
            lower.endsWith('.appimage') ||
            lower.endsWith('.bin') ||
            lower.endsWith('.sh') ||
            (hasNoExtension && !hasIgnoredExt)) {
            return { type: 'native-binary' };
        }

        if (lower.endsWith('.exe')) {
            return { type: 'windows-exe' };
        }

        return null;
    },

    /**
     * Get list of system directories that should be blocked
     */
    getBlockedSystemDirectories(app) {
        return [
            '/',
            '/bin',
            '/boot',
            '/dev',
            '/etc',
            '/lib',
            '/lib64',
            '/proc',
            '/root',
            '/run',
            '/sbin',
            '/sys',
            '/tmp',
            '/usr',
            '/var',
            app.getPath('home'),
            app.getPath('downloads'),
            app.getPath('documents'),
            app.getPath('desktop')
        ];
    },

    /**
     * Ensure file is executable (important for AppImages)
     */
    ensureExecutable(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                // Check if it's an AppImage or we want to force executable for everything we launch
                // For now, let's just do it for everything that looks like a linux executable file
                // 0o755 = rwxr-xr-x
                fs.chmodSync(filePath, '755');
                return true;
            }
        } catch (error) {
            console.error('Failed to set executable permissions:', error);
        }
        return false;
    }
};
