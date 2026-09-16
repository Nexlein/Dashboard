import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
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

    it('toggles dark mode when switch is clicked', () => {
        render(<Navbar />);
        const themeSwitch = screen.getByRole('switch');

        // Initial state is light
        expect(themeSwitch).not.toBeChecked();
        expect(document.documentElement).not.toHaveClass('dark');

        // Click to toggle dark
        fireEvent.click(themeSwitch);
        expect(themeSwitch).toBeChecked();
        expect(document.documentElement).toHaveClass('dark');

        // Click to toggle back to light
        fireEvent.click(themeSwitch);
        expect(themeSwitch).not.toBeChecked();
        expect(document.documentElement).not.toHaveClass('dark');
    });
});
