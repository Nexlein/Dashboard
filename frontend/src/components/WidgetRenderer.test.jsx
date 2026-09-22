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

    it('renders a crypto price with its market statistics', async () => {
        fetchWidgetData.mockResolvedValue({
            type: 'crypto_price',
            coin: 'bitcoin',
            currency: 'eur',
            price: 62000.5,
            marketCap: 1230000000000,
            volume24h: 28000000000,
            change24h: 2.345,
            lastUpdatedAt: 1770000000,
        });

        render(
            <WidgetRenderer
                widget={{
                    id: 3,
                    serviceName: 'crypto',
                    widgetName: 'crypto_price',
                    refreshRate: 60,
                }}
            />,
        );

        expect(await screen.findByTestId('crypto-price')).toBeInTheDocument();
        expect(screen.getByText('bitcoin')).toBeInTheDocument();
        expect(screen.getByText('+2.35%')).toBeInTheDocument();
        expect(screen.getByText('Market cap')).toBeInTheDocument();
        expect(screen.getByText('24h volume')).toBeInTheDocument();
        expect(fetchWidgetData).toHaveBeenCalledWith(3);
    });
});
