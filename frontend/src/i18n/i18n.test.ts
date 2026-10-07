import { createInstance } from 'i18next';
import { afterEach, describe, expect, it } from 'vitest';
import i18n, { changeLanguage } from './index';
import { LANGUAGE_STORAGE_KEY } from './language';
import { defaultNS, resources } from './resources';

afterEach(async () => {
    await i18n.changeLanguage('en');
    localStorage.clear();
});

function flattenMessages(value: object, prefix = ''): Record<string, string> {
    return Object.fromEntries(
        Object.entries(value).flatMap(([key, entry]) => {
            const name = prefix ? `${prefix}.${key}` : key;
            return typeof entry === 'string'
                ? [[name, entry]]
                : Object.entries(flattenMessages(entry, name));
        }),
    );
}

describe('i18n foundation', () => {
    it('is ready before the first render and synchronizes the document language', () => {
        expect(i18n.isInitialized).toBe(true);
        expect(document.documentElement.lang).toBe(i18n.resolvedLanguage);
    });

    it('changes the translation, html.lang and explicit saved preference', async () => {
        await changeLanguage('fr');
        expect(i18n.t('language.label')).toBe('Langue');
        expect(document.documentElement.lang).toBe('fr');
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
        await changeLanguage('en');
        expect(i18n.t('language.label')).toBe('Language');
        expect(document.documentElement.lang).toBe('en');
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    });

    it('updates the SEO description together with the selected document language', async () => {
        const description = document.createElement('meta');
        description.name = 'description';
        document.head.append(description);
        try {
            await changeLanguage('fr');
            expect(description.content).toBe(resources.fr.common.metaDescription);
            expect(document.documentElement.lang).toBe('fr');
            await changeLanguage('en');
            expect(description.content).toBe(resources.en.common.metaDescription);
            expect(document.documentElement.lang).toBe('en');
        } finally {
            description.remove();
        }
    });

    it('falls back to English for a missing French translation', async () => {
        const isolated = createInstance();
        await isolated.init({
            defaultNS,
            lng: 'fr',
            fallbackLng: 'en',
            resources: { en: resources.en, fr: { common: {} } },
        });
        expect(isolated.t('language.label')).toBe('Language');
    });

    it('keeps the same namespaces, keys and interpolation variables in FR and EN', () => {
        expect(Object.keys(resources.fr).sort()).toEqual(Object.keys(resources.en).sort());
        const english = flattenMessages(resources.en);
        const french = flattenMessages(resources.fr);
        expect(Object.keys(french).sort()).toEqual(Object.keys(english).sort());
        const variables = (text: string) =>
            [...text.matchAll(/{{\s*([^},]+)(?:,[^}]*)?\s*}}/g)]
                .map((match) => match[1].trim())
                .sort();
        const tags = (text: string) =>
            [...text.matchAll(/<\/?([a-z]+)>/g)].map((match) => match[0]).sort();
        for (const [key, text] of Object.entries(english)) {
            expect(french[key].trim(), key).not.toBe('');
            expect(variables(french[key]), key).toEqual(variables(text));
            expect(tags(french[key]), key).toEqual(tags(text));
        }
    });
});
