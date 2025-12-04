export type ThemeColors = {
    background: string;
    surface: string;
    accent: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    // Festival specific
    festivalPrimary?: string;
    festivalSecondary?: string;
};

const base: ThemeColors = {
    background: '#171a21',
    surface: '#1b2838',
    accent: '#66c0f4',
    text: '#c6d4df',
    textSecondary: '#8f98a0',
    border: '#2a475e',
    success: '#a4d007',
    error: '#c94a4a',
};

export const Colors = {
    dark: base,
    christmas: {
        ...base,
        background: '#0f1e14', // Very dark green tint
        surface: '#162b20',     // Dark green surface
        accent: '#d42426',      // Christmas Red
        border: '#2f5e41',
        festivalPrimary: '#d42426', // Red
        festivalSecondary: '#146b3a', // Green
    },
    halloween: {
        ...base,
        background: '#1a0f0f', // Very dark orange/red tint
        surface: '#2b1616',
        accent: '#ff7b00',     // Pumpkin Orange
        border: '#5e3a18',
        festivalPrimary: '#ff7b00',
        festivalSecondary: '#6e2c91', // Purple
    },
    new_year: {
        ...base,
        accent: '#ffd700', // Gold
        festivalPrimary: '#ffd700',
        festivalSecondary: '#c0c0c0', // Silver
    }
};

