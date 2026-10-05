import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render as _originalRender, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/apiClient';
import WidgetRenderer from './WidgetRenderer';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fetchWidgetData } from '@/features/widgets/lib/widgets';
import { makeWidget } from '@/test/fixtures';

const mockUseUpdateWidgetMutate = vi.fn();

vi.mock('@/features/widgets/hooks/useWidgets', () => ({
    useUpdateWidget: () => ({ mutate: mockUseUpdateWidgetMutate, isPending: false }),
}));

vi.mock('@/features/widgets/lib/widgets', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/widgets/lib/widgets')>()),
    fetchWidgetData: vi.fn(),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const customRender = (ui: React.ReactElement) => {
    return _originalRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('WidgetRenderer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it('renders current weather returned by the backend', async () => {
        vi.mocked(fetchWidgetData).mockResolvedValue({
            location: { name: 'Paris', country: 'FR' },
            temperature: 19,
            feelsLike: 18,
            humidity: 70,
            windSpeed: 3.2,
            condition: 'clear sky',
            icon: '01d',
        });

        customRender(
            <WidgetRenderer
                widget={makeWidget({
                    id: 1,
                    serviceName: 'weather',
                    widgetName: 'current_weather',
                    refreshRate: 60,
                })}
            />,
        );

        expect(await screen.findByTestId('current-weather')).toBeInTheDocument();
        expect(screen.getByText('19°C')).toBeInTheDocument();
        expect(screen.getByText('Paris, FR')).toBeInTheDocument();
        expect(fetchWidgetData).toHaveBeenCalledWith(1);
    });

    it('does not request data for services that are not implemented', () => {
        customRender(
            <WidgetRenderer
                widget={makeWidget({
                    id: 2,
                    serviceName: 'unsupported-service',
                    widgetName: 'unsupported-widget',
                    refreshRate: 60,
                })}
            />,
        );

        expect(screen.getByText('This widget is not implemented yet.')).toBeInTheDocument();
        expect(fetchWidgetData).not.toHaveBeenCalled();
    });

    it('renders a crypto price with its market statistics', async () => {
        vi.mocked(fetchWidgetData).mockResolvedValue({
            type: 'crypto_price',
            coin: 'bitcoin',
            currency: 'eur',
            price: 62000.5,
            marketCap: 1230000000000,
            volume24h: 28000000000,
            change24h: 2.345,
            lastUpdatedAt: 1770000000,
        });

        customRender(
            <WidgetRenderer
                widget={makeWidget({
                    id: 3,
                    serviceName: 'crypto',
                    widgetName: 'crypto_price',
                    refreshRate: 60,
                })}
            />,
        );

        expect(await screen.findByTestId('crypto-price')).toBeInTheDocument();
        expect(screen.getByText('bitcoin')).toBeInTheDocument();
        expect(screen.getByText('+2.35%')).toBeInTheDocument();
        expect(fetchWidgetData).toHaveBeenCalledWith(3);
    });

    it('persists a stock profile period without replacing the selected company', async () => {
        vi.mocked(fetchWidgetData).mockResolvedValue({
            period: '1M',
            series: [
                {
                    symbol: 'AAPL',
                    name: 'Apple Inc',
                    currency: 'USD',
                    exchange: 'NASDAQ',
                    logo: null,
                    currentPrice: 120,
                    change: 1,
                    prices: [
                        { timestamp: 1000, price: 100 },
                        { timestamp: 2000, price: 120 },
                    ],
                },
            ],
        });
        customRender(
            <WidgetRenderer
                widget={makeWidget({
                    id: 51,
                    serviceName: 'stocks',
                    widgetName: 'stock_profile',
                    params: { symbols: 'AAPL', period: '1M' },
                })}
            />,
        );
        await screen.findByTestId('stock-profile');
        fireEvent.click(screen.getByRole('button', { name: '5Y' }));
        expect(mockUseUpdateWidgetMutate).toHaveBeenCalledWith({
            id: 51,
            updates: { params: { symbols: 'AAPL', period: '5Y' } },
        });
    });

    it('keeps the previous stock chart visible when a new period is waiting for credits', async () => {
        const old = makeWidget({
            id: 52,
            serviceName: 'stocks',
            widgetName: 'stock_profile',
            params: { symbols: 'AAPL', period: '1M' },
        });
        const data = {
            period: '1M',
            series: [
                {
                    symbol: 'AAPL',
                    name: 'Apple Inc',
                    currency: 'USD',
                    exchange: null,
                    logo: null,
                    currentPrice: 120,
                    change: 1,
                    prices: [
                        { timestamp: 1000, price: 100 },
                        { timestamp: 2000, price: 120 },
                    ],
                },
            ],
        };
        queryClient.setQueryData(['widget', old.id, old.params], data);
        vi.mocked(fetchWidgetData).mockRejectedValue(new ApiError('Waiting for credits', 429, 45));
        const next = { ...old, params: { ...old.params, period: '5Y' } };
        customRender(<WidgetRenderer widget={next} />);
        expect(await screen.findByText(/Waiting for API credits/)).toBeInTheDocument();
        expect(screen.getByTestId('stock-profile-line')).toBeInTheDocument();
        expect(screen.getByText(/Showing previously loaded data \(1M\)/)).toBeInTheDocument();
        expect(screen.queryByText(/Error loading/)).toBeNull();
    });

    it('automatically resumes an initial stock load after the provider cooldown', async () => {
        vi.mocked(fetchWidgetData)
            .mockRejectedValueOnce(new ApiError('Waiting for credits', 429, 1))
            .mockResolvedValue({
                period: '1M',
                series: [
                    {
                        symbol: 'AAPL',
                        name: 'Apple Inc',
                        currency: 'USD',
                        exchange: null,
                        logo: null,
                        currentPrice: 120,
                        change: 1,
                        prices: [{ timestamp: 1000, price: 100 }],
                    },
                ],
            });
        customRender(
            <WidgetRenderer
                widget={makeWidget({
                    id: 53,
                    serviceName: 'stocks',
                    widgetName: 'stock_profile',
                    params: { symbols: 'AAPL', period: '1M' },
                })}
            />,
        );
        expect(await screen.findByText('Loading data progressively')).toBeInTheDocument();
        expect(
            await screen.findByTestId('stock-profile', {}, { timeout: 3000 }),
        ).toBeInTheDocument();
        expect(fetchWidgetData).toHaveBeenCalledTimes(2);
    });

    it('renders multiple crypto curves that can be toggled from the legend', async () => {
        vi.mocked(fetchWidgetData).mockResolvedValue({
            type: 'crypto_chart',
            currency: 'eur',
            days: 7,
            series: [
                {
                    coin: 'bitcoin',
                    name: 'Bitcoin',
                    symbol: 'BTC',
                    image: 'https://assets.coingecko.com/bitcoin.png',
                    currentPrice: 63000,
                    change: 5,
                    prices: [
                        { timestamp: 1000, price: 60000 },
                        { timestamp: 2000, price: 63000 },
                    ],
                },
                {
                    coin: 'ethereum',
                    currentPrice: 2850,
                    change: -5,
                    prices: [
                        { timestamp: 1000, price: 3000 },
                        { timestamp: 2000, price: 2850 },
                    ],
                },
            ],
        });

        customRender(
            <WidgetRenderer
                widget={makeWidget({
                    id: 4,
                    serviceName: 'crypto',
                    widgetName: 'crypto_chart',
                    params: { coins: 'bitcoin,ethereum', currency: 'eur', days: '7' },
                    refreshRate: 60,
                })}
            />,
        );

        expect(await screen.findByTestId('crypto-chart')).toBeInTheDocument();
        expect(screen.getByTestId('crypto-line-bitcoin')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '3M' }));

        await waitFor(() =>
            expect(mockUseUpdateWidgetMutate).toHaveBeenCalledWith({
                id: 4,
                updates: { params: { coins: 'bitcoin,ethereum', currency: 'eur', days: '90' } },
            }),
        );
    });
});
