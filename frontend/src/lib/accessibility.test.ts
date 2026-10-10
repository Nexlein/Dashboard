import { afterEach, describe, expect, it } from 'vitest';
import {
    ACCESSIBILITY_STORAGE_KEY,
    initAccessibility,
    resetAccessibility,
    setAccessibility,
} from './accessibility';

const root = document.documentElement;

afterEach(() => {
    resetAccessibility();
    localStorage.clear();
});

describe('accessibility settings', () => {
    it('applies the text size and options to <html> and remembers them', () => {
        setAccessibility({ textSize: 150, highContrast: true, motion: 'reduce' });

        expect(root.style.fontSize).toBe('150%');
        expect(root).toHaveClass('a11y-contrast');
        expect(root.dataset.motion).toBe('reduce');
        expect(JSON.parse(localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)!)).toMatchObject({
            textSize: 150,
            highContrast: true,
        });
    });

    it('restores the saved settings at startup', () => {
        localStorage.setItem(
            ACCESSIBILITY_STORAGE_KEY,
            JSON.stringify({ textSize: 200, underlineLinks: true }),
        );

        initAccessibility();

        expect(root.style.fontSize).toBe('200%');
        expect(root).toHaveClass('a11y-underline-links');
    });

    it('ignores invalid or corrupted saved values', () => {
        localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify({ textSize: 900 }));
        initAccessibility();
        expect(root.style.fontSize).toBe('');

        localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, '{not json');
        expect(() => initAccessibility()).not.toThrow();
    });

    it('goes back to the defaults on reset, following the system for motion', () => {
        setAccessibility({ textSize: 125, readableFont: true, motion: 'allow' });

        resetAccessibility();

        expect(root.style.fontSize).toBe('');
        expect(root).not.toHaveClass('a11y-readable-font');
        expect(root.dataset.motion).toBeUndefined();
    });
});
