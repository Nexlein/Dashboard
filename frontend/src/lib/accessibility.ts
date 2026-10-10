import { useSyncExternalStore } from 'react';

export const TEXT_SIZES = [100, 125, 150, 200] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
/** `system` follows the operating system's "reduce motion" setting. */
export type MotionPreference = 'system' | 'reduce' | 'allow';

export type AccessibilitySettings = {
    textSize: TextSize;
    highContrast: boolean;
    motion: MotionPreference;
    underlineLinks: boolean;
    textSpacing: boolean;
    readableFont: boolean;
};

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
    textSize: 100,
    highContrast: false,
    motion: 'system',
    underlineLinks: false,
    textSpacing: false,
    readableFont: false,
};

export const ACCESSIBILITY_STORAGE_KEY = 'dashboard-accessibility';

/** Keeps only valid stored values, so an old or edited entry never breaks the page. */
function parse(value: unknown): AccessibilitySettings {
    const saved = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    const flag = (key: keyof AccessibilitySettings) =>
        typeof saved[key] === 'boolean' ? (saved[key] as boolean) : DEFAULT_ACCESSIBILITY[key];
    return {
        textSize: TEXT_SIZES.includes(saved.textSize as TextSize)
            ? (saved.textSize as TextSize)
            : DEFAULT_ACCESSIBILITY.textSize,
        highContrast: flag('highContrast') as boolean,
        motion: ['system', 'reduce', 'allow'].includes(saved.motion as string)
            ? (saved.motion as MotionPreference)
            : DEFAULT_ACCESSIBILITY.motion,
        underlineLinks: flag('underlineLinks') as boolean,
        textSpacing: flag('textSpacing') as boolean,
        readableFont: flag('readableFont') as boolean,
    };
}

function load(): AccessibilitySettings {
    try {
        return parse(JSON.parse(localStorage.getItem(ACCESSIBILITY_STORAGE_KEY) ?? '{}'));
    } catch {
        return DEFAULT_ACCESSIBILITY;
    }
}

/**
 * Applies the settings to <html>: the text size scales every `rem` (all Tailwind sizes), and
 * classes switch the rules of index.css. Runs before the first render (main.tsx) so the page
 * never shows with the default settings first.
 */
export function applyAccessibility(settings: AccessibilitySettings) {
    const root = document.documentElement;
    root.style.fontSize = settings.textSize === 100 ? '' : `${settings.textSize}%`;
    root.classList.toggle('a11y-contrast', settings.highContrast);
    root.classList.toggle('a11y-underline-links', settings.underlineLinks);
    root.classList.toggle('a11y-text-spacing', settings.textSpacing);
    root.classList.toggle('a11y-readable-font', settings.readableFont);
    if (settings.motion === 'system') delete root.dataset.motion;
    else root.dataset.motion = settings.motion;
}

let current: AccessibilitySettings = DEFAULT_ACCESSIBILITY;
const listeners = new Set<() => void>();

/** Reads the saved settings and applies them; main.tsx calls it once at startup. */
export function initAccessibility() {
    current = load();
    applyAccessibility(current);
}

export function setAccessibility(changes: Partial<AccessibilitySettings>) {
    current = parse({ ...current, ...changes });
    applyAccessibility(current);
    try {
        localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(current));
    } catch {
        // Still applied for this visit when browser storage is unavailable.
    }
    listeners.forEach((listener) => listener());
}

export function resetAccessibility() {
    setAccessibility(DEFAULT_ACCESSIBILITY);
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** The current settings; components re-render when they change. */
export function useAccessibility(): AccessibilitySettings {
    return useSyncExternalStore(subscribe, () => current);
}
