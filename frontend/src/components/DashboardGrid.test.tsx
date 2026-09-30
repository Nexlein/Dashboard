import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import DashboardGrid from './DashboardGrid';
import { useStore } from '@/store/useStore';
import { vi } from 'vitest';
import { deleteWidget } from '@/lib/widgets';

vi.mock('@/lib/widgets', () => ({
    deleteWidget: vi.fn(),
    updateWidgetLayouts: vi.fn(),
}));

vi.mock('./WidgetRenderer', () => ({
    default: ({ widget }) => (
        <div data-testid={`widget-${widget.i}`}>Mocked {widget.title} Content</div>
    ),
}));

describe('DashboardGrid Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store with dummy widgets
        useStore.setState({
            widgets: [
                {
                    i: 'a',
                    x: 0,
                    y: 0,
                    w: 4,
                    h: 2,
                    title: 'Weather Widget',
                    serviceName: 'weather',
                },
                { i: 'b', x: 4, y: 0, w: 4, h: 2, title: 'GitHub Repo' },
            ],
        });
    });

    it('renders all widgets from the store', () => {
        render(<DashboardGrid />);

        expect(screen.getByText('Weather Widget')).toBeInTheDocument();
        expect(screen.getByText('GitHub Repo')).toBeInTheDocument();
    });

    it('deletes a widget after confirmation', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        deleteWidget.mockResolvedValue();
        render(<DashboardGrid />);

        fireEvent.click(screen.getByRole('button', { name: 'Configure Weather Widget' }));
        fireEvent.click(await screen.findByText('Delete'));

        await waitFor(() => expect(deleteWidget).toHaveBeenCalled());
        expect(screen.queryByText('Weather Widget')).not.toBeInTheDocument();
        expect(screen.getByText('GitHub Repo')).toBeInTheDocument();
    });
});
