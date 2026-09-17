import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Navbar from './Navbar';
import { useStore } from '@/store/useStore';

describe('Navbar Component', () => {
    beforeEach(() => {
        // Reset store before each test
        useStore.setState({ theme: 'light' });
        document.documentElement.className = '';
    });

    it('renders Dashboard title', () => {
        render(<Navbar />);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders the display name when available', () => {
        render(<Navbar user={{ displayName: 'Test User', email: 'user@example.com' }} />);

        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('toggles dark mode when switch is clicked', () => {
        render(<Navbar />);

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
        render(<Navbar onLogout={onLogout} />);

        fireEvent.click(screen.getByRole('button', { name: /ouvrir le menu du compte/i }));
        fireEvent.click(screen.getByRole('menuitem', { name: /se déconnecter/i }));

        expect(onLogout).toHaveBeenCalledOnce();
    });

    it('removes the dark theme when leaving the dashboard', () => {
        useStore.setState({ theme: 'dark' });
        const { unmount } = render(<Navbar />);

        expect(document.documentElement).toHaveClass('dark');
        unmount();

        expect(document.documentElement).not.toHaveClass('dark');
    });
});
