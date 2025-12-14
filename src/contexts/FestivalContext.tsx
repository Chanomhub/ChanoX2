import { createContext, useContext, ReactNode } from 'react';

// Theme colors matching ChanoX2 dark theme
const defaultTheme = {
    background: '#1e2329',
    surface: '#1b2838',
    text: '#c7d5e0',
    accent: '#66c0f4',
    border: '#3d4a5a',
};

interface FestivalContextType {
    theme: typeof defaultTheme;
    isFestival: boolean;
}

const FestivalContext = createContext<FestivalContextType>({
    theme: defaultTheme,
    isFestival: false,
});

export function FestivalProvider({ children }: { children: ReactNode }) {
    // TODO: Migrate festival logic from original project
    return (
        <FestivalContext.Provider value={{ theme: defaultTheme, isFestival: false }}>
            {children}
        </FestivalContext.Provider>
    );
}

export const useFestival = () => useContext(FestivalContext);
