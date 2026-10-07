import i18n from '@/i18n';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '../test-utils';
import Navbar from './Navbar';
import { makeUser } from '../test/fixtures';

const renderNavbar = (props: Partial<React.ComponentProps<typeof Navbar>> = {}) =>
    render(<Navbar user={makeUser()} onLogout={vi.fn()} {...props} />);

describe('Navbar Component', () => {
    beforeEach(async () => {
        await i18n.changeLanguage('en');
        document.documentElement.className = '';
        localStorage.clear();
    });

    it('renders Dashboard title', () => {
        renderNavbar();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders the display name when available', () => {
        renderNavbar({ user: makeUser({ name: 'Test User' }) });
        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('toggles dark mode when switch is clicked', () => {
        renderNavbar();

        expect(document.documentElement).not.toHaveClass('dark');

        fireEvent.click(screen.getByRole('button', { name: /dark theme/i }));
        expect(localStorage.getItem('test-theme')).toBe('dark');
        expect(document.documentElement).toHaveClass('dark');

        fireEvent.click(screen.getByRole('button', { name: /light theme/i }));
        expect(localStorage.getItem('test-theme')).toBe('light');
        expect(document.documentElement).not.toHaveClass('dark');
    });

    it('offers the language switch only inside the account menu', async () => {
        renderNavbar();
        expect(screen.queryByRole('menuitemradio', { name: 'Français' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Français' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /open the account menu/i }));
        fireEvent.click(screen.getByRole('menuitemradio', { name: 'Français' }));
        await waitFor(() => {
            expect(screen.getByRole('menuitemradio', { name: 'Français' })).toHaveAttribute(
                'aria-checked',
                'true',
            );
            expect(document.documentElement.lang).toBe('fr');
            expect(localStorage.getItem('dashboard-language')).toBe('fr');
        });
        fireEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));
        await waitFor(() => expect(document.documentElement.lang).toBe('en'));
    });

    it('opens the widget configurator on the first click and can reopen it', async () => {
        renderNavbar();
        fireEvent.click(screen.getByRole('button', { name: 'Add Widget' }));
        expect(await screen.findByRole('dialog')).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'Add Widget' }));
        expect(await screen.findByRole('dialog')).toBeVisible();
    });

    it('calls the logout handler', () => {
        const onLogout = vi.fn();
        renderNavbar({ onLogout });

        fireEvent.click(screen.getByRole('button', { name: /open the account menu/i }));
        fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));

        expect(onLogout).toHaveBeenCalledOnce();
    });
});
