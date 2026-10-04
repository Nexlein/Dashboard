import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../test-utils';
import DashboardGrid from './DashboardGrid';
import { toDashboardWidget } from '@/lib/widgets';

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

vi.mock('react-grid-layout/legacy', () => ({
    Responsive: ({ children }: any) => <div>{children}</div>,
    WidthProvider: (Component: any) => Component,
}));

describe('DashboardGrid Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseWidgets.mockReturnValue({
            data: [
                toDashboardWidget({
                    id: 1,
                    serviceName: 'weather',
                    widgetName: 'current_weather',
                    params: { city: 'Paris' },
                    refreshRate: 60,
                    layout: { x: 0, y: 0, w: 2, h: 2 },
                }),
                toDashboardWidget({
                    id: 2,
                    serviceName: 'github',
                    widgetName: 'repo_stats',
                    params: {},
                    refreshRate: 300,
                    layout: { x: 2, y: 0, w: 2, h: 2 },
                }),
            ],
            isLoading: false,
        });
    });

    it('renders all widgets from the hook', () => {
        render(<DashboardGrid />);
        expect(screen.getByTestId('widget-1')).toBeInTheDocument();
        expect(screen.getByTestId('widget-2')).toBeInTheDocument();
    });

    it('shows presentation titles instead of raw widget ids', () => {
        render(<DashboardGrid />);
        expect(screen.getByText('Weather')).toBeInTheDocument();
        expect(screen.getByText('GitHub - Repository Stats')).toBeInTheDocument();
    });

    it('calls remove mutation after confirmation', async () => {
        window.confirm = vi.fn().mockReturnValue(true);
        render(<DashboardGrid />);

        const settingsButtons = screen.getAllByRole('button', { name: /Configure/i });
        fireEvent.click(settingsButtons[0]);
        fireEvent.click(await screen.findByText('Delete'));

        expect(mockRemoveWidgetMutate).toHaveBeenCalledWith(1);
    });
});
