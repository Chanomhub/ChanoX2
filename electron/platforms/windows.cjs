const path = require('path');

/**
 * Windows Platform Implementation
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

        return path.join(app.getPath('desktop'), `${safeName}.lnk`);
    },

    /**
     * Prepare launch command and arguments
     */
    prepareLaunch(executablePath, args, { useWine }) {
        // Windows is simple: no wine.
        return {
            command: executablePath,
            finalArgs: args,
            detached: true
        };
    },

    /**
     * Check if a file is a valid game executable
     */
    isGameExecutable(file, stats) {
        if (file.toLowerCase().endsWith('.exe')) {
            return { type: 'windows-exe' };
        }
        return null;
    }
};
