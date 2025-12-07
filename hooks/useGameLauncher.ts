import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

export interface GameConfig {
    executablePath: string;
    useWine: boolean;
    args?: string[];
    locale?: string;
    engine?: string;
    gameVersion?: string;
}

export const useGameLauncher = (gameId: number | string) => {
    const [config, setConfig] = useState<GameConfig | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const saved = await window.electronAPI.getGameConfig(gameId);
            setConfig(saved);
        } catch (err) {
            setError('Failed to load game config');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [gameId]);

    const saveConfig = useCallback(async (newConfig: GameConfig) => {
        try {
            await window.electronAPI.saveGameConfig({ gameId, config: newConfig });
            setConfig(newConfig);
            return true;
        } catch (err) {
            console.error('Failed to save config', err);
            return false;
        }
    }, [gameId]);

    const launchGame = useCallback(async (launchConfig?: GameConfig) => {
        const configToUse = launchConfig || config;

        if (!configToUse?.executablePath) {
            return { success: false, error: 'No executable path configured' };
        }

        console.log('Launching game with:', configToUse);
        try {
            const result = await window.electronAPI.launchGame({
                executablePath: configToUse.executablePath,
                useWine: configToUse.useWine,
                args: configToUse.args,
                locale: configToUse.locale
            });
            return result;
        } catch (err: any) {
            return { success: false, error: err.message || 'Unknown error' };
        }
    }, [config]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    return {
        config,
        isLoading,
        error,
        loadConfig,
        saveConfig,
        launchGame
    };
};
