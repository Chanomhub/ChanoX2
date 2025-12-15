import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, defaultNS } from './resources';

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        defaultNS,
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;

