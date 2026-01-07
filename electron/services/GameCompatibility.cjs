const fs = require('fs');
const path = require('path');

// Rule definitions
const rules = [
    {
        id: 'dotnet-globalization',
        name: '.NET Globalization Fix',
        description: 'Fixes "unimplemented function icu.dll" and similar errors in .NET games on Wine',

        // Check if rule applies
        check: (gamePath, context) => {
            // Only apply on Linux/Wine
            if (process.platform !== 'linux') return false;
            // If explicit "Use Wine" is false (and not forced by context), skip? 
            // Actually, context.useWine tells us if we are running via Wine.
            if (!context.useWine && !gamePath.toLowerCase().endsWith('.exe')) return false;

            try {
                const dir = path.dirname(gamePath);

                // Debug logging
                console.log(`🔍 [GameCompatibility] Checking dir: ${dir}`);

                // Helper to check a directory
                const checkDir = (directory) => {
                    try {
                        const files = fs.readdirSync(directory);
                        // Check for strong indicators
                        if (files.some(f => f.endsWith('.runtimeconfig.json'))) {
                            console.log(`✅ Found .runtimeconfig.json in ${directory}`);
                            return true;
                        }
                        if (files.some(f => f === 'System.Private.CoreLib.dll')) {
                            console.log(`✅ Found System.Private.CoreLib.dll in ${directory}`);
                            return true;
                        }
                        return false;
                    } catch (e) {
                        return false;
                    }
                };

                // 1. Check root directory
                if (checkDir(dir)) return true;

                // 2. Check immediate subdirectories (depth 1)
                // Many games put binaries in a subfolder e.g. Game/Binaries/Win64
                // OR the .exe is a launcher and the real managed code is in a data folder
                const rootFiles = fs.readdirSync(dir);
                for (const file of rootFiles) {
                    const fullPath = path.join(dir, file);
                    try {
                        if (fs.statSync(fullPath).isDirectory()) {
                            if (checkDir(fullPath)) return true;
                        }
                    } catch (e) { }
                }

                console.log('❌ No .NET indicators found in directory or subdirectories');

            } catch (e) {
                console.error('Error checking compatibility rule dotnet-globalization:', e);
            }
            return false;
        },

        // Environment variables to apply
        env: {
            DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: '1'
        }
    }
];

class GameCompatibility {
    /**
     * Get environment variables for compatibility fixes
     * @param {string} gamePath - Full path to game executable
     * @param {object} context - Context object { useWine: boolean, ... }
     * @returns {object} - Object containing env vars (e.g. { VAR: '1' })
     */
    static getEnv(gamePath, context = {}) {
        const env = {};
        const appliedRules = [];

        for (const rule of rules) {
            if (rule.check(gamePath, context)) {
                Object.assign(env, rule.env);
                appliedRules.push(rule.name);
            }
        }

        if (appliedRules.length > 0) {
            console.log(`🛠️ [GameCompatibility] Applied fixes for ${path.basename(gamePath)}:`, appliedRules.join(', '));
        }

        return env;
    }
}

module.exports = GameCompatibility;
