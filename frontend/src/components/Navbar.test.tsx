import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '../test-utils';
import Navbar from './Navbar';

describe('Navbar Component', () => {
    beforeEach(() => {
        document.documentElement.className = '';
        localStorage.clear();
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
});
