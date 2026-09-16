import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WidgetConfigurator } from './WidgetConfigurator';
import { useStore } from '@/store/useStore';

vi.mock('@/store/useStore', () => ({
    useStore: vi.fn(),
}));

describe('WidgetConfigurator', () => {
    it('renders the add widget button and opens modal', () => {
        useStore.mockReturnValue(vi.fn());

        render(<WidgetConfigurator />);

        // The button should be in the document
        const button = screen.getByRole('button', { name: /add widget/i });
        expect(button).toBeInTheDocument();

        // Click it to open the dialog
        fireEvent.click(button);

        // Dialog title should appear
        expect(screen.getByText('Configure New Widget')).toBeInTheDocument();
    });
});
