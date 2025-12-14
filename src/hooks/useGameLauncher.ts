import { useState, useEffect, useCallback } from 'react';
import { GameConfig as ElectronGameConfig } from '@/types/electron';

export interface GameConfig extends ElectronGameConfig {
    executablePath?: string; // override to match electron type optionality or keep specific
    useWine?: boolean;
    args?: string[];
    locale?: string;
    engine?: string;
    gameVersion?: string;
    lastPlayed?: string;
    playTime?: number;
}

export const useGameLauncher = (gameId: number | string) => {
    const [config, setConfig] = useState<GameConfig | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            if (window.electronAPI) {
                const saved = await window.electronAPI.getGameConfig(String(gameId));
                setConfig(saved as GameConfig);
            }
        } catch (err) {
            setError('Failed to load game config');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [gameId]);

    const saveConfig = useCallback(async (newConfig: GameConfig) => {
        try {
            if (window.electronAPI) {
                await window.electronAPI.saveGameConfig({
                    gameId: String(gameId),
                    config: newConfig
                });
                setConfig(newConfig);
                return true;
            }
            return false;
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
            if (window.electronAPI) {
                const result = await window.electronAPI.launchGame({
                    executablePath: configToUse.executablePath,
                    useWine: configToUse.useWine,
                    args: configToUse.args,
                    locale: configToUse.locale
                });
                return result;
            }
            return { success: false, error: 'Electron API unavailable' };
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
