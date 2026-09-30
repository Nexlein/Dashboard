import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WidgetConfigurator } from './WidgetConfigurator';
import { useStore } from '@/store/useStore';
import { MemoryRouter } from 'react-router-dom';
import { fetchServices } from '@/lib/services';
import { createWidget } from '@/lib/widgets';
import { REGISTRY } from '@/lib/registry';

vi.mock('@/store/useStore', () => ({
    useStore: vi.fn(),
}));

vi.mock('@/lib/services', () => ({
    fetchServices: vi.fn(),
}));

vi.mock('@/lib/widgets', () => ({
    createWidget: vi.fn(),
    getDefaultWidgetLayout: vi.fn().mockReturnValue({ w: 2, h: 2 }),
    toDashboardWidget: vi.fn((w) => w),
    MIN_REFRESH_RATE_SECONDS: 30,
    areParamsComplete: vi.fn().mockReturnValue(true),
    isRefreshRateValid: vi.fn().mockReturnValue(true),
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
        crypto: {
            name: 'Crypto',
            hasRefresh: true,
            widgets: [
                { id: 'price', name: 'Price', params: [{ id: 'coin', label: 'Coin' }] },
                { id: 'chart', name: 'Chart', params: [{ id: 'coin', label: 'Coin' }] },
            ],
        },
    },
}));

describe('WidgetConfigurator', () => {
    const addWidgetMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useStore.mockReturnValue(addWidgetMock);
        fetchServices.mockResolvedValue([{ name: 'weather', connected: true, configurable: true }]);
    });

    it('renders the add widget button and opens modal', async () => {
        render(
            <MemoryRouter>
                <WidgetConfigurator />
            </MemoryRouter>,
        );

        const button = screen.getByRole('button', { name: /add widget/i });
        fireEvent.click(button);

        expect(screen.getByText('Add New Widget')).toBeInTheDocument();
        await waitFor(() => expect(fetchServices).toHaveBeenCalled());
    });

    it('displays error if fetchServices fails', async () => {
        fetchServices.mockRejectedValue(new Error('Network Error'));
        render(
            <MemoryRouter>
                <WidgetConfigurator />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getByRole('button', { name: /add widget/i }));

        await waitFor(() => {
            expect(screen.getByText('Network Error')).toBeInTheDocument();
        });
    });

    it('auto-selects widgetType if service has only one widget', async () => {
        render(
            <MemoryRouter>
                <WidgetConfigurator />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole('button', { name: /add widget/i }));
        await waitFor(() => expect(fetchServices).toHaveBeenCalled());

        const selectButton = screen.getByRole('combobox', { name: /service/i });
        fireEvent.click(selectButton);
        const weatherOption = screen.getByText('Weather');

        await act(async () => {
            fireEvent.click(weatherOption);
        });

        // The widgetType should be set to 'current' automatically since Weather has only 1 widget.
        // And the form (WidgetForm) should render. We can verify this by checking if the 'City' label appears.
        expect(screen.getByLabelText('City')).toBeInTheDocument();
    });

    it('requires manual widget selection if service has multiple widgets', async () => {
        render(
            <MemoryRouter>
                <WidgetConfigurator />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole('button', { name: /add widget/i }));
        await waitFor(() => expect(fetchServices).toHaveBeenCalled());

        const selectButton = screen.getByRole('combobox', { name: /service/i });
        fireEvent.click(selectButton);
        const cryptoOption = screen.getByText('Crypto');

        await act(async () => {
            fireEvent.click(cryptoOption);
        });

        // Should not auto-select, so 'Add to Dashboard' is disabled
        const addButton = screen.getByRole('button', { name: /add to dashboard/i });
        expect(addButton).toBeDisabled();
    });

    it('saves a widget correctly', async () => {
        createWidget.mockResolvedValue({ id: '123' });

        render(
            <MemoryRouter>
                <WidgetConfigurator />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole('button', { name: /add widget/i }));
        await waitFor(() => expect(fetchServices).toHaveBeenCalled());

        // Select Weather
        fireEvent.click(screen.getByRole('combobox', { name: /service/i }));
        fireEvent.click(screen.getByText('Weather'));

        // Fill out City
        const cityInput = screen.getByLabelText('City');
        fireEvent.change(cityInput, { target: { value: 'Paris' } });

        const addButton = screen.getByRole('button', { name: /add to dashboard/i });
        await act(async () => {
            fireEvent.click(addButton);
        });

        expect(createWidget).toHaveBeenCalledWith(
            expect.objectContaining({
                serviceName: 'weather',
                widgetName: 'current',
            }),
        );

        expect(addWidgetMock).toHaveBeenCalledWith({ id: '123' });
    });

    it('shows error if createWidget fails', async () => {
        createWidget.mockRejectedValue(new Error('Failed to create!'));

        render(
            <MemoryRouter>
                <WidgetConfigurator />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole('button', { name: /add widget/i }));
        await waitFor(() => expect(fetchServices).toHaveBeenCalled());

        // Select Weather
        fireEvent.click(screen.getByRole('combobox', { name: /service/i }));
        fireEvent.click(screen.getByText('Weather'));

        // Fill out City
        const cityInput = screen.getByLabelText('City');
        fireEvent.change(cityInput, { target: { value: 'Paris' } });

        const addButton = screen.getByRole('button', { name: /add to dashboard/i });
        await act(async () => {
            fireEvent.click(addButton);
        });

        expect(screen.getByText('Failed to create!')).toBeInTheDocument();
    });
});
