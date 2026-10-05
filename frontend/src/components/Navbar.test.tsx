import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '../test-utils';
import Navbar from './Navbar';
import { makeUser } from '../test/fixtures';

const renderNavbar = (props: Partial<React.ComponentProps<typeof Navbar>> = {}) =>
    render(<Navbar user={makeUser()} onLogout={vi.fn()} {...props} />);

describe('Navbar Component', () => {
    beforeEach(() => {
        document.documentElement.className = '';
        localStorage.clear();
    });

    it('renders Dashboard title', () => {
        renderNavbar();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders the display name when available', () => {
        renderNavbar({ user: makeUser({ displayName: 'Test User' }) });
        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('toggles dark mode when switch is clicked', () => {
        renderNavbar();

        expect(document.documentElement).not.toHaveClass('dark');

        fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu du compte/i }));
        fireEvent.click(screen.getByRole('menuitem', { name: /thème sombre/i }));
        expect(document.documentElement).toHaveClass('dark');

        fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu du compte/i }));
        fireEvent.click(screen.getByRole('menuitem', { name: /thème clair/i }));
        expect(document.documentElement).not.toHaveClass('dark');
    });

    it('calls the logout handler', () => {
        const onLogout = vi.fn();
        renderNavbar({ onLogout });

        fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu du compte/i }));
        fireEvent.click(screen.getByRole('menuitem', { name: /se déconnecter/i }));

        expect(onLogout).toHaveBeenCalledOnce();
    });
});
