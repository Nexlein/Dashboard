import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CookieBanner } from './CookieBanner';

afterEach(() => localStorage.clear());

describe('CookieBanner', () => {
    it.each([
        ['Accept', 'accepted'],
        ['Decline', 'declined'],
    ])('remembers %s and hides itself', (button, stored) => {
        const { unmount } = render(<CookieBanner />);
        fireEvent.click(screen.getByRole('button', { name: button }));

        expect(screen.queryByRole('region', { name: 'Cookie consent' })).toBeNull();
        expect(localStorage.getItem('cookie-consent')).toBe(stored);

        unmount();
        render(<CookieBanner />);
        expect(screen.queryByRole('region', { name: 'Cookie consent' })).toBeNull();
    });

    it('is shown until the visitor chooses', () => {
        render(<CookieBanner />);
        expect(screen.getByRole('region', { name: 'Cookie consent' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Read our Privacy Policy' })).toHaveAttribute(
            'href',
            '/privacy',
        );
    });
});
