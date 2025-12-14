import { createContext, useContext, ReactNode } from 'react';

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => { },
});

export function LanguageProvider({ children }: { children: ReactNode }) {
    // TODO: Migrate i18n logic from original project
    return (
        <LanguageContext.Provider value={{ language: 'en', setLanguage: () => { } }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
