import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../test-utils';
import { WidgetConfigurator } from './WidgetConfigurator';
import { fetchServices } from '@/features/services/lib/services';

const mockUseAddWidgetMutate = vi.fn();

vi.mock('@/features/widgets/hooks/useWidgets', () => ({
    useAddWidget: () => ({ mutate: mockUseAddWidgetMutate, isPending: false }),
}));

vi.mock('@/features/services/lib/services', () => ({
    fetchServices: vi.fn(),
}));

describe('WidgetConfigurator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchServices.mockResolvedValue([]);
    });

    it('renders the add widget button and opens modal', async () => {
        render(<WidgetConfigurator />);

        const button = screen.getByRole('button', { name: /add widget/i });
        expect(button).toBeInTheDocument();

        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText('Add New Widget')).toBeInTheDocument();
        });
    });
});
