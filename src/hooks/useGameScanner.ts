import { useState, useCallback } from 'react';
import { native } from '@/lib/native';

export interface ScanResult {
    path: string;
    type: string;
}

export const useGameScanner = () => {
    const [results, setResults] = useState<ScanResult[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    const scanDirectory = useCallback(async (path: string) => {
        if (!path) return [];

        setIsScanning(true);
        try {
            const scanResults = await native.game.scanGameExecutables(path);
            setResults(scanResults);
            return scanResults;
        } catch (err) {
            console.error('Scan failed', err);
            return [];
        } finally {
            setIsScanning(false);
        }
    }, []);

    return {
        results,
        isScanning,
        scanDirectory
    };
};
