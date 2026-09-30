import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WidgetEditDialog } from './WidgetEditDialog';
import { useStore } from '@/store/useStore';
import { updateWidget } from '@/lib/widgets';

vi.mock('@/store/useStore', () => ({
    useStore: vi.fn(),
}));

vi.mock('@/lib/widgets', () => ({
    updateWidget: vi.fn(),
    toDashboardWidget: vi.fn((w) => ({
        ...w,
        title: 'Mocked Title',
    })),
    MIN_REFRESH_RATE_SECONDS: 30,
}));

vi.mock('@/lib/registry', () => ({
    REGISTRY: {
        weather: {
            name: 'Weather',
            hasRefresh: true,
            widgets: [
                { id: 'current', name: 'Current Weather', params: [{ id: 'city', label: 'City' }] },
            ],
        },
    },
}));

describe('WidgetEditDialog', () => {
    const mockUpdateWidgetInStore = vi.fn();
    const mockWidget = {
        i: '10',
        serviceName: 'weather',
        widgetName: 'current',
        params: { city: 'London' },
        refreshRate: 120,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useStore.mockReturnValue(mockUpdateWidgetInStore);
    });

    it('renders null if no widget is provided', () => {
        const { container } = render(
            <WidgetEditDialog open={true} onOpenChange={vi.fn()} widget={null} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders dialog with pre-filled widget data when open', () => {
        render(<WidgetEditDialog open={true} onOpenChange={vi.fn()} widget={mockWidget} />);
        expect(screen.getByText('Edit Widget')).toBeInTheDocument();
        expect(screen.getByLabelText('City')).toBeInTheDocument();
        expect(screen.getByDisplayValue('London')).toBeInTheDocument();
        expect(screen.getByLabelText('Refresh Rate (seconds)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    });

    it('saves changes and calls onOpenChange on success', async () => {
        const onOpenChangeMock = vi.fn();
        updateWidget.mockResolvedValue({ params: { city: 'Paris' }, refreshRate: 60 });

        render(
            <WidgetEditDialog open={true} onOpenChange={onOpenChangeMock} widget={mockWidget} />,
        );

        const cityInput = screen.getByLabelText('City');
        fireEvent.change(cityInput, { target: { value: 'Paris' } });

        const refreshInput = screen.getByLabelText('Refresh Rate (seconds)');
        fireEvent.change(refreshInput, { target: { value: '60' } });

        const saveButton = screen.getByRole('button', { name: /save changes/i });
        await act(async () => {
            fireEvent.click(saveButton);
        });

        expect(updateWidget).toHaveBeenCalledWith(10, {
            params: { city: 'Paris' },
            refreshRate: 60,
        });

        expect(mockUpdateWidgetInStore).toHaveBeenCalledWith(
            '10',
            expect.objectContaining({
                params: { city: 'Paris' },
                refreshRate: 60,
                title: 'Mocked Title',
            }),
        );

        expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });

    it('displays error if updateWidget fails', async () => {
        updateWidget.mockRejectedValue(new Error('Update failed'));

        render(<WidgetEditDialog open={true} onOpenChange={vi.fn()} widget={mockWidget} />);

        const saveButton = screen.getByRole('button', { name: /save changes/i });
        await act(async () => {
            fireEvent.click(saveButton);
        });

        expect(screen.getByText('Update failed')).toBeInTheDocument();
    });

    it('disables save button if refresh rate is invalid', () => {
        render(<WidgetEditDialog open={true} onOpenChange={vi.fn()} widget={mockWidget} />);

        const refreshInput = screen.getByLabelText('Refresh Rate (seconds)');
        fireEvent.change(refreshInput, { target: { value: '10' } }); // min is 30

        const saveButton = screen.getByRole('button', { name: /save changes/i });
        expect(saveButton).toBeDisabled();
    });

    it('closes on cancel button click', () => {
        const onOpenChangeMock = vi.fn();
        render(
            <WidgetEditDialog open={true} onOpenChange={onOpenChangeMock} widget={mockWidget} />,
        );

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
        expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
});
