import { render, screen } from '@testing-library/react';
import WidgetRenderer from './WidgetRenderer';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fetchWidgetData } from '@/lib/widgets';

vi.mock('@/lib/widgets', () => ({ fetchWidgetData: vi.fn() }));

describe('WidgetRenderer', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders current weather returned by the backend', async () => {
        fetchWidgetData.mockResolvedValue({
            location: { name: 'Paris', country: 'FR' },
            temperature: 19,
            feelsLike: 18,
            humidity: 70,
            windSpeed: 3.2,
            condition: 'clear sky',
            icon: '01d',
        });

        render(
            <WidgetRenderer
                widget={{
                    id: 1,
                    serviceName: 'weather',
                    widgetName: 'current_weather',
                    refreshRate: 60,
                }}
            />,
        );

        expect(await screen.findByTestId('current-weather')).toBeInTheDocument();
        expect(screen.getByText('19°C')).toBeInTheDocument();
        expect(screen.getByText('Paris, FR')).toBeInTheDocument();
        expect(fetchWidgetData).toHaveBeenCalledWith(1);
    });

    it('does not request data for services that are not implemented', () => {
        render(
            <WidgetRenderer
                widget={{
                    id: 2,
                    serviceName: 'unsupported-service',
                    widgetName: 'unsupported-widget',
                    refreshRate: 60,
                }}
            />,
        );

        expect(screen.getByText('This service is not implemented yet.')).toBeInTheDocument();
        expect(fetchWidgetData).not.toHaveBeenCalled();
    });
});
