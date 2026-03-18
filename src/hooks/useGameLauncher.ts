import { useState, useEffect, useCallback } from 'react';
import { GameConfig as ElectronGameConfig } from '@/types/electron';
import { native } from '@/lib/native';

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
    const [isRunning, setIsRunning] = useState(false);
    const [gamePid, setGamePid] = useState<number | null>(null);

    const loadConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const saved = await native.game.getGameConfig(String(gameId));
            setConfig(saved as GameConfig);
        } catch (err) {
            setError('Failed to load game config');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [gameId]);

    const saveConfig = useCallback(async (newConfig: GameConfig) => {
        try {
            await native.game.saveGameConfig({
                gameId: String(gameId),
                config: newConfig
            });
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

        console.log('Launching game with:', { gameId, config: configToUse });
        try {
            const result = await native.game.launchGame({
                executablePath: configToUse.executablePath,
                useWine: configToUse.useWine,
                args: configToUse.args,
                locale: configToUse.locale,
                gameId: String(gameId) // Pass gameId for playtime tracking
            });
            if (result.success) {
                setIsRunning(true);
            }
            return result;
        } catch (err: any) {
            return { success: false, error: err.message || 'Unknown error' };
        }
    }, [config, gameId]);

    const stopGame = useCallback(async () => {
        try {
            const result = await native.game.stopGame(String(gameId));
            if (result.success) {
                setIsRunning(false);
            }
            return result;
        } catch (err: any) {
            return { success: false, error: err.message || 'Unknown error' };
        }
    }, [gameId]);

    // Check initial running state and setup event listeners
    useEffect(() => {
        const checkRunning = async () => {
            const running = await native.game.isGameRunning(String(gameId));
            setIsRunning(running);
        };
        checkRunning();

        // Listen for game started/stopped events
        const cleanupStarted = native.game.onGameStarted((data) => {
            if (data.gameId === String(gameId)) {
                console.log('🎮 Game started:', data);
                setIsRunning(true);
                setGamePid(data.pid);
            }
        });

        const cleanupStopped = native.game.onGameStopped((data) => {
            if (data.gameId === String(gameId)) {
                console.log('🎮 Game stopped:', data);
                setIsRunning(false);
                setGamePid(null);
                // Reload config to get updated playtime
                loadConfig();
            }
        });

        return () => {
            if (cleanupStarted) cleanupStarted();
            if (cleanupStopped) cleanupStopped();
        };
    }, [gameId, loadConfig]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    return {
        config,
        isLoading,
        error,
        isRunning,
        gamePid,
        loadConfig,
        saveConfig,
        launchGame,
        stopGame
    };
};
