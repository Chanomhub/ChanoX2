
import { useState, useEffect, useCallback } from 'react';
import { native } from '@/lib/native';

export interface InstalledMod {
    id: number;
    name: string;
    version: string;
    installedAt: string; // ISO date string
    filename: string;
}

export function useInstalledMods(gamePath: string | undefined) {
    const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
    const [loading, setLoading] = useState(true);

    const manifestPath = gamePath ? `${gamePath}/installed_mods.json` : undefined;

    const loadManifest = useCallback(async () => {
        if (!manifestPath) {
            setLoading(false);
            return;
        }

        try {
            const content = await native.fs.readFileContent(manifestPath);
            if (content) {
                const mods = JSON.parse(content);
                setInstalledMods(Array.isArray(mods) ? mods : []);
            } else {
                setInstalledMods([]);
            }
        } catch (err) {
            console.error('Failed to load installed mods manifest:', err);
            setInstalledMods([]);
        } finally {
            setLoading(false);
        }
    }, [manifestPath]);

    const saveManifest = useCallback(async (mods: InstalledMod[]) => {
        if (!manifestPath) return;
        try {
            await native.fs.writeFileContent(manifestPath, JSON.stringify(mods, null, 2));
            setInstalledMods(mods);
        } catch (err) {
            console.error('Failed to save installed mods manifest:', err);
        }
    }, [manifestPath]);

    useEffect(() => {
        loadManifest();
    }, [loadManifest]);

    const addInstalledMod = async (mod: InstalledMod) => {
        const newMods = [...installedMods.filter(m => m.id !== mod.id), mod];
        await saveManifest(newMods);
    };

    const removeInstalledMod = async (modId: number) => {
        const mod = installedMods.find(m => m.id === modId);
        if (!mod || !gamePath) return;

        // Delete the file first
        const filePath = `${gamePath}/${mod.filename}`;
        try {
            await native.fs.deleteFile(filePath);
        } catch (err) {
            console.error('Failed to delete mod file:', err);
            // We might still want to remove it from manifest if file is gone
        }

        const newMods = installedMods.filter(m => m.id !== modId);
        await saveManifest(newMods);
    };

    const isInstalled = (modId: number) => {
        return installedMods.some(m => m.id === modId);
    };

    return {
        installedMods,
        loading,
        addInstalledMod,
        removeInstalledMod,
        isInstalled,
        refresh: loadManifest
    };
}
