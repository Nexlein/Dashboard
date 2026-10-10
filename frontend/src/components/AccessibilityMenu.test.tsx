import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@/test-utils';
import { resetAccessibility } from '@/lib/accessibility';
import { AccessibilityMenu } from './AccessibilityMenu';

afterEach(() => {
    resetAccessibility();
    localStorage.clear();
});

describe('AccessibilityMenu', () => {
    it('changes the text size and options from a labelled dialog', async () => {
        render(<AccessibilityMenu />);

        fireEvent.click(screen.getByRole('button', { name: 'Accessibility settings' }));
        const dialog = await screen.findByRole('dialog', { name: 'Accessibility' });
        fireEvent.click(screen.getByRole('radio', { name: '150%' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'High contrast' }));

        expect(dialog).toBeInTheDocument();
        expect(document.documentElement.style.fontSize).toBe('150%');
        expect(document.documentElement).toHaveClass('a11y-contrast');
        expect(screen.getByRole('radio', { name: '150%' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'High contrast' })).toHaveAccessibleDescription(
            'Darker text, stronger borders and focus ring.',
        );
    });

    it('resets every setting', async () => {
        render(<AccessibilityMenu />);
        fireEvent.click(screen.getByRole('button', { name: 'Accessibility settings' }));
        await screen.findByRole('dialog');
        fireEvent.click(screen.getByRole('checkbox', { name: 'Underline links' }));

        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

        expect(screen.getByRole('checkbox', { name: 'Underline links' })).not.toBeChecked();
        expect(screen.getByRole('radio', { name: '100%' })).toBeChecked();
    });
});
