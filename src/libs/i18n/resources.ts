import en from './locales/en.json';
import th from './locales/th.json';

export const resources = {
    en: { translation: en },
    th: { translation: th },
} as const;

export const defaultNS = 'translation';
