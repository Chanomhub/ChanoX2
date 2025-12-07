import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'react-native-localize';
import '@/libs/i18n'; // Initialize i18n
import i18n from '@/libs/i18n';

type Language = 'en' | 'th' | 'jp' | 'zh';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => Promise<void>;
    isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const SUPPORTED_LANGUAGES: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'th', label: 'Thai' },
    { code: 'jp', label: 'Japanese' },
    { code: 'zh', label: 'Chinese' },
];

const LANGUAGE_KEY = 'user_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLanguage();
    }, []);

    // ... existing code ...

    const loadLanguage = async () => {
        try {
            let savedLanguage: string | null = null;

            if (Platform.OS === 'web') {
                savedLanguage = localStorage.getItem(LANGUAGE_KEY);
            } else {
                savedLanguage = await SecureStore.getItemAsync(LANGUAGE_KEY);
            }

            if (savedLanguage && isSupportedLanguage(savedLanguage)) {
                setLanguageState(savedLanguage as Language);
                await i18n.changeLanguage(savedLanguage);
            } else {
                // Detect device language
                const locales = Localization.getLocales();
                if (locales.length > 0) {
                    const deviceLanguage = locales[0].languageCode;
                    if (isSupportedLanguage(deviceLanguage)) {
                        setLanguageState(deviceLanguage as Language);
                        await i18n.changeLanguage(deviceLanguage);
                    }
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
            if (Platform.OS === 'web') {
                localStorage.setItem(LANGUAGE_KEY, lang);
            } else {
                await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
            }
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

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
