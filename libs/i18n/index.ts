import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // Initial default, to be updated by LanguageContext
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        compatibilityJSON: 'v4',
    });

export default i18n;
