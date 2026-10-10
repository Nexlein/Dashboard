import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../../test-utils';
import DashboardGrid from './DashboardGrid';
import { toDashboardWidget, type DashboardWidget } from '@/features/widgets/lib/widgets';

const mockUseWidgets = vi.fn();
const mockRemoveWidgetMutate = vi.fn();
const mockUpdateLayoutChange = vi.fn();
const mockChangeWidget = vi.fn();

vi.mock('@/features/widgets/hooks/useWidgets', () => ({
    useWidgets: () => mockUseWidgets(),
    useRemoveWidget: () => ({ mutate: mockRemoveWidgetMutate }),
    useUpdateWidget: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Until /about.json loads, the edit dialog uses the frontend widget definitions.
vi.mock('@/features/widgets/hooks/useWidgetCatalog', () => ({
    useWidgetCatalog: () => ({ data: undefined }),
}));

vi.mock('@/features/widgets/hooks/useWidgetLayoutManager', () => ({
    useWidgetLayoutManager: () => ({
        onLayoutChange: mockUpdateLayoutChange,
        changeWidget: mockChangeWidget,
    }),
}));

vi.mock('./WidgetRenderer', () => ({
    default: ({ widget }: { widget: DashboardWidget }) => (
        <div data-testid={`widget-${widget.id}`}>Mocked {widget.widgetName} Content</div>
    ),
}));

vi.mock('react-grid-layout/legacy', () => ({
    Responsive: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    WidthProvider: <P,>(Component: React.ComponentType<P>) => Component,
}));

describe('DashboardGrid Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockChangeWidget.mockReset();
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
                    params: { owner: 'facebook', repo: 'react' },
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

    it('opens the edit dialog with the values of the widget being edited', async () => {
        render(<DashboardGrid />);

        fireEvent.click(screen.getByRole('button', { name: 'Configure Weather' }));
        fireEvent.click(await screen.findByText('Edit'));
        expect(await screen.findByLabelText('City Name')).toHaveValue('Paris');
        expect(screen.getByLabelText('Refresh Rate (seconds)')).toHaveValue(60);
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        fireEvent.click(
            screen.getByRole('button', { name: 'Configure GitHub - Repository Stats' }),
        );
        fireEvent.click(await screen.findByText('Edit'));
        expect(await screen.findByLabelText('Repository Name')).toHaveValue('react');
        expect(screen.getByLabelText('Refresh Rate (seconds)')).toHaveValue(300);
    });

    it('moves and resizes a widget with the arrow keys, and announces it', () => {
        render(<DashboardGrid />);
        // The grid is drawn again after each move: look the handle up each time.
        const handle = () => screen.getByRole('button', { name: 'Move or resize Weather' });

        mockChangeWidget.mockReturnValueOnce({ x: 1, y: 0, w: 2, h: 2 });
        fireEvent.keyDown(handle(), { key: 'ArrowRight' });
        expect(mockChangeWidget).toHaveBeenLastCalledWith(1, { dx: 1 });
        expect(screen.getByRole('status')).toHaveTextContent('Weather moved to column 2.');

        mockChangeWidget.mockReturnValueOnce({ x: 1, y: 0, w: 2, h: 3 });
        fireEvent.keyDown(handle(), { key: 'ArrowDown', shiftKey: true });
        expect(mockChangeWidget).toHaveBeenLastCalledWith(1, { dh: 1 });
        expect(screen.getByRole('status')).toHaveTextContent('Weather resized to 2 by 3.');
    });

    it('ignores other keys and announces nothing when the widget cannot move', () => {
        render(<DashboardGrid />);
        const handle = screen.getByRole('button', { name: 'Move or resize Weather' });

        fireEvent.keyDown(handle, { key: 'Enter' });
        mockChangeWidget.mockReturnValueOnce(null);
        fireEvent.keyDown(handle, { key: 'ArrowLeft' });

        expect(mockChangeWidget).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
});
