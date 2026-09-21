import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Navbar from './Navbar';
import { useStore } from '@/store/useStore';
import { MemoryRouter } from 'react-router-dom';

function renderNavbar(props = {}) {
    return render(
        <MemoryRouter>
            <Navbar {...props} />
        </MemoryRouter>,
    );
}

describe('Navbar Component', () => {
    beforeEach(() => {
        // Reset store before each test
        useStore.setState({ theme: 'light' });
        document.documentElement.className = '';
    });

    it('renders Dashboard title', () => {
        renderNavbar();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders the display name when available', () => {
        renderNavbar({ user: { displayName: 'Test User', email: 'user@example.com' } });

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

    it('removes the dark theme when leaving the dashboard', () => {
        useStore.setState({ theme: 'dark' });
        const { unmount } = renderNavbar();

        expect(document.documentElement).toHaveClass('dark');
        unmount();

        expect(document.documentElement).not.toHaveClass('dark');
    });
});
