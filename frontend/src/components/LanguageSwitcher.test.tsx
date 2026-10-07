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
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Français' }));
    await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(document.documentElement.lang).toBe('fr');
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
    });
    expect(detectLanguage()).toBe('fr');
    expect(screen.getByRole('group', { name: 'Langue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
        'aria-pressed',
        'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    await waitFor(() => {
        expect(document.documentElement.lang).toBe('en');
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    });
});

it('still changes the interface when saving the preference is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Blocked', 'SecurityError');
    });
    renderSwitcher();
    fireEvent.click(screen.getByRole('button', { name: 'Français' }));
    await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Français' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(document.documentElement.lang).toBe('fr');
    });
});
