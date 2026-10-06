import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '@/i18n';
import { detectLanguage, LANGUAGE_STORAGE_KEY } from '@/i18n/language';
import { LanguageSwitcher } from './LanguageSwitcher';

beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage('en');
    localStorage.clear();
});

function renderSwitcher() {
    render(
        <I18nextProvider i18n={i18n}>
            <LanguageSwitcher />
        </I18nextProvider>,
    );
}

it('switches languages without reloading, with an accessible name and persisted choice', async () => {
    renderSwitcher();
    const selector = screen.getByRole('combobox', { name: 'Language' });
    expect(selector).toHaveValue('en');
    fireEvent.change(selector, { target: { value: 'fr' } });
    await waitFor(() => {
        expect(screen.getByRole('combobox', { name: 'Langue' })).toHaveValue('fr');
        expect(document.documentElement.lang).toBe('fr');
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
    });
    expect(detectLanguage()).toBe('fr');
    expect(screen.getByRole('option', { name: 'Français' })).toHaveAttribute('lang', 'fr');
    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('lang', 'en');
});

it('still changes the interface when saving the preference is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Blocked', 'SecurityError');
    });
    renderSwitcher();
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
        target: { value: 'fr' },
    });
    await waitFor(() => {
        expect(screen.getByRole('combobox', { name: 'Langue' })).toHaveValue('fr');
        expect(document.documentElement.lang).toBe('fr');
    });
});
