import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../test-utils';
import DashboardGrid from './DashboardGrid';

const mockUseWidgets = vi.fn();
const mockRemoveWidgetMutate = vi.fn();
const mockUpdateLayoutChange = vi.fn();

vi.mock('@/hooks/useWidgets', () => ({
    useWidgets: () => mockUseWidgets(),
    useRemoveWidget: () => ({ mutate: mockRemoveWidgetMutate }),
}));

vi.mock('@/hooks/useWidgetLayoutManager', () => ({
    useWidgetLayoutManager: () => ({ onLayoutChange: mockUpdateLayoutChange }),
}));

vi.mock('./WidgetRenderer', () => ({
    default: ({ widget }: any) => (
        <div data-testid={`widget-${widget.id}`}>Mocked {widget.widgetName} Content</div>
    ),
}));

describe('DashboardGrid Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseWidgets.mockReturnValue({
            data: [
                {
                    id: 1,
                    i: '1',
                    widgetName: 'weather_current',
                    serviceName: 'weather',
                    layout: { x: 0, y: 0, w: 2, h: 2 },
                },
                {
                    id: 2,
                    i: '2',
                    widgetName: 'github_stats',
                    serviceName: 'github',
                    layout: { x: 2, y: 0, w: 2, h: 2 },
                },
            ],
            isLoading: false,
        });
    });

    it('renders all widgets from the hook', () => {
        render(<DashboardGrid />);
        expect(screen.getByTestId('widget-1')).toBeInTheDocument();
        expect(screen.getByTestId('widget-2')).toBeInTheDocument();
    });

    it('calls remove mutation after confirmation', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<DashboardGrid />);

        const settingsButtons = screen.getAllByRole('button', { name: /Configure/i });
        fireEvent.click(settingsButtons[0]);
        fireEvent.click(await screen.findByText('Delete'));

        expect(mockRemoveWidgetMutate).toHaveBeenCalledWith('1');
    });
});
