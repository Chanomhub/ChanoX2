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

        if (useWine) {
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
        const ignoredExts = ['.sh', '.so', '.txt', '.png', '.jpg', '.json', '.xml', '.html', '.css', '.js'];
        const hasIgnoredExt = ignoredExts.some(ext => lower.endsWith(ext));

        if ((isExecutable && !hasIgnoredExt) || lower.endsWith('.x86_64') || lower.endsWith('.x86') || lower.endsWith('.appimage')) {
            return { type: 'native-binary' };
        }

        if (lower.endsWith('.exe')) {
            return { type: 'windows-exe' };
        }

        return null;
    }
};
