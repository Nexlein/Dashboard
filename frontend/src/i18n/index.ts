import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
    detectLanguage,
    FALLBACK_LANGUAGE,
    normalizeLanguage,
    saveLanguage,
    SUPPORTED_LANGUAGES,
    type Language,
} from './language';
import { defaultNS, resources } from './resources';

const i18n = createInstance();

function syncDocumentLanguage(language: string) {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = normalizeLanguage(language) ?? FALLBACK_LANGUAGE;
    }
}

i18n.on('languageChanged', syncDocumentLanguage);

// Bundled resources initialize synchronously, before React's first render.
void i18n.use(initReactI18next).init({
    resources,
    defaultNS,
    ns: Object.keys(resources.en),
    lng: detectLanguage(),
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: FALLBACK_LANGUAGE,
    load: 'languageOnly',
    initAsync: false,
    interpolation: { escapeValue: false }, // React escapes rendered text.
});

export async function changeLanguage(language: Language) {
    await i18n.changeLanguage(language);
    saveLanguage(language);
}

export default i18n;
