import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    detectLanguage,
    LANGUAGE_STORAGE_KEY,
    normalizeLanguage,
    resolveLanguage,
    saveLanguage,
} from './language';

afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('language preference', () => {
    it.each([
        ['fr-FR', 'fr'],
        ['fr-CA', 'fr'],
        ['EN-us', 'en'],
        ['de-DE', undefined],
        [null, undefined],
    ])('normalizes %s to %s', (value, expected) => {
        expect(normalizeLanguage(value)).toBe(expected);
    });

    it('prioritizes an explicit saved language over the browser', () => {
        expect(resolveLanguage('en', ['fr-FR'])).toBe('en');
        expect(resolveLanguage('fr', ['en-US'])).toBe('fr');
    });

    it('skips an invalid preference and unsupported browser languages', () => {
        expect(resolveLanguage('invalid', ['de-DE', 'fr-CA', 'en'])).toBe('fr');
        expect(resolveLanguage(null, ['de-DE', 'en-GB', 'fr'])).toBe('en');
    });

    it('falls back to English when no supported language is available', () => {
        expect(resolveLanguage(null, ['de-DE'])).toBe('en');
        expect(resolveLanguage(null, [])).toBe('en');
    });

    it('detects the browser language without persisting an automatic choice', () => {
        vi.stubGlobal('navigator', { languages: ['de-DE', 'fr-FR'], language: 'de-DE' });
        expect(detectLanguage()).toBe('fr');
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
        saveLanguage('en');
        expect(detectLanguage()).toBe('en');
    });

    it('still detects and permits selection when storage is blocked', () => {
        vi.stubGlobal('navigator', { languages: ['fr-FR'], language: 'fr-FR' });
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('Blocked', 'SecurityError');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('Blocked', 'SecurityError');
        });
        expect(detectLanguage()).toBe('fr');
        expect(() => saveLanguage('en')).not.toThrow();
    });
});
