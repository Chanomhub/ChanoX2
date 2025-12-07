import commonEn from './locales/en/common.json';
import authEn from './locales/en/auth.json';
import homeEn from './locales/en/home.json';

import commonTh from './locales/th/common.json';
import authTh from './locales/th/auth.json';
import homeTh from './locales/th/home.json';

export const resources = {
    en: {
        common: commonEn,
        auth: authEn,
        home: homeEn,
    },
    th: {
        common: commonTh,
        auth: authTh,
        home: homeTh,
    },
} as const;
