export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const FALLBACK_LANGUAGE: Language = 'en';
export const LANGUAGE_STORAGE_KEY = 'dashboard-language';

/** Reduce regional language tags to the languages the interface supports. */
export function normalizeLanguage(value: string | null | undefined): Language | undefined {
    const language = value?.toLowerCase().split('-')[0];
    return SUPPORTED_LANGUAGES.find((supported) => supported === language);
}

/** An explicit choice wins; otherwise use the first supported browser language. */
export function resolveLanguage(
    preference: string | null | undefined,
    browserLanguages: readonly string[],
): Language {
    return (
        normalizeLanguage(preference) ??
        browserLanguages.map(normalizeLanguage).find((language) => language !== undefined) ??
        FALLBACK_LANGUAGE
    );
}

export function detectLanguage(): Language {
    let preference: string | null = null;
    try {
        preference = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
        // Private/restricted browsing can make localStorage unavailable.
    }
    return resolveLanguage(
        preference,
        typeof navigator === 'undefined' ? [] : [...navigator.languages, navigator.language],
    );
}

export function saveLanguage(language: Language) {
    try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
        // The selection still works for this visit when persistence is unavailable.
    }
}
