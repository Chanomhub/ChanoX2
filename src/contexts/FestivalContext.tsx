import { createContext, useContext, ReactNode } from 'react';

// Theme colors matching ChanoX2 Warm Dark Amber theme
const defaultTheme = {
    background: '#151311',
    surface: '#211d1a',
    text: '#f5f0eb',
    accent: '#f59e0b',
    border: '#38332e',
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
