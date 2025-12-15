import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import '@/libs/i18n'; // Initialize i18n
import i18n from '@/libs/i18n';

export type Language = 'en' | 'th';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => Promise<void>;
    isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: async () => { },
    isLoading: true,
});

export const SUPPORTED_LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'th', label: 'Thai', nativeLabel: 'ไทย' },
];

const LANGUAGE_KEY = 'user_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const savedLanguage = localStorage.getItem(LANGUAGE_KEY);

            if (savedLanguage && isSupportedLanguage(savedLanguage)) {
                setLanguageState(savedLanguage as Language);
                await i18n.changeLanguage(savedLanguage);
            } else {
                // Detect browser language
                const browserLang = navigator.language.split('-')[0];
                if (isSupportedLanguage(browserLang)) {
                    setLanguageState(browserLang as Language);
                    await i18n.changeLanguage(browserLang);
                }
            }
        } catch (error) {
            console.error('Failed to load language preference:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setLanguage = async (lang: Language) => {
        try {
            localStorage.setItem(LANGUAGE_KEY, lang);
            setLanguageState(lang);
            await i18n.changeLanguage(lang);
        } catch (error) {
            console.error('Failed to save language preference:', error);
        }
    };

    const isSupportedLanguage = (lang: string): boolean => {
        return SUPPORTED_LANGUAGES.some(l => l.code === lang);
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, isLoading }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
