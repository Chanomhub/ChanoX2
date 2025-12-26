const path = require('path');

/**
 * MacOS Platform Implementation
 */
module.exports = {
    /**
     * Get path for desktop shortcut
     */
    getShortcutPath(app, title) {
        const safeName = title
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 80);

        return path.join(app.getPath('home'), 'Desktop', `${safeName}.command`);
    },

    /**
     * Prepare launch command and arguments
     */
    prepareLaunch(executablePath, args, { useWine, wineProvider, globalSettings }) {
        let command = executablePath;
        let finalArgs = args;
        let detached = true;

        if (useWine) {
            if (wineProvider === 'custom') {
                const customCmd = globalSettings.externalWineCommand || 'open %EXE%'; // Default fallback
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
                detached = false; // Usually attaching to shell/open command
            } else {
                command = 'wine';
                finalArgs = [executablePath, ...args];
            }
        } else if (executablePath.endsWith('.app')) {
            // Launch standard Mac App
            command = 'open';
            finalArgs = ['-a', executablePath, ...args];
            detached = false;
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
            '.sh', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico',
            '.json', '.xml', '.html', '.css', '.js', '.ts', '.md',
            '.config', '.cfg', '.ini', '.log', '.dat', '.db',
            '.mp3', '.wav', '.ogg', '.mp4', '.mkv', '.avi', '.mov',
            '.zip', '.rar', '.7z', '.tar', '.gz', '.xz', '.pdf', '.dylib', '.so'
        ];
        const hasIgnoredExt = ignoredExts.some(ext => lower.endsWith(ext));

        // macOS binaries often have no extension
        const hasNoExtension = !lower.includes('.');

        if ((isExecutable && !hasIgnoredExt) || (hasNoExtension && isExecutable)) {
            return { type: 'mac-binary' };
        }

        return null;
    },

    /**
     * Check if a DIRECTORY is a valid game executable (Special for Mac .app)
     */
    isGameDirectory(dirPath) {
        if (dirPath.endsWith('.app')) {
            return { type: 'mac-app' };
        }
        return null;
    },

    /**
     * Get list of system directories that should be blocked
     */
    getBlockedSystemDirectories(app) {
        return [
            '/',
            '/Applications',
            '/System',
            '/Library',
            '/bin',
            '/sbin',
            '/usr',
            '/var',
            '/private',
            app.getPath('home'),
            app.getPath('downloads'),
            app.getPath('documents'),
            app.getPath('desktop')
        ];
    },

    /**
     * Ensure file is executable (important for command-line games)
     */
    ensureExecutable(filePath) {
        const fs = require('fs');
        try {
            if (fs.existsSync(filePath)) {
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
