import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StockMarketWidget, type StockMarketData } from './StockMarketWidget';
import type { DashboardWidget } from '@/features/widgets/lib/widgets';

const data: StockMarketData = {
    period: '1M',
    series: [
        {
            symbol: 'AAPL',
            name: 'Apple Inc',
            currency: 'USD',
            exchange: 'NASDAQ',
            logo: 'https://logo.twelvedata.com/apple.com',
            currentPrice: 250,
            change: 1.5,
            prices: [
                { timestamp: Date.parse('2026-09-01'), price: 230 },
                { timestamp: Date.parse('2026-10-01'), price: 250 },
            ],
        },
        {
            symbol: 'NVDA',
            name: 'NVIDIA Corp',
            currency: 'USD',
            exchange: 'NASDAQ',
            logo: null,
            currentPrice: 190,
            change: -0.75,
            prices: [
                { timestamp: Date.parse('2026-09-01'), price: 200 },
                { timestamp: Date.parse('2026-10-01'), price: 190 },
            ],
        },
    ],
};

const widget = {
    id: 10,
    serviceName: 'stocks',
    widgetName: 'stock_market',
    params: { symbols: 'AAPL,NVDA', period: '1M' },
    refreshRate: 60,
    layout: { x: 0, y: 0, w: 6, h: 5 },
    i: '10',
    x: 0,
    y: 0,
    w: 6,
    h: 5,
    title: 'Stock Market',
} satisfies DashboardWidget;

describe('StockMarketWidget', () => {
    it('renders stock identities, prices and independent comparison curves', () => {
        render(
            <StockMarketWidget
                data={data}
                widget={widget}
                selectedPeriod="1M"
                onPeriodChange={vi.fn()}
                periodUpdating={false}
            />,
        );

        expect(screen.getByText('Apple Inc')).toBeInTheDocument();
        expect(screen.getByText('NVIDIA Corp')).toBeInTheDocument();
        expect(screen.getByTestId('stock-line-AAPL')).toBeInTheDocument();
        expect(screen.getByTestId('stock-line-NVDA')).toBeInTheDocument();
        expect(
            screen.getByRole('img', {
                name: 'Stock performance comparison chart',
            }),
        ).toBeInTheDocument();
    });

    it('keeps available comparison curves visible without an unavailable message', () => {
        render(
            <StockMarketWidget
                data={{
                    ...data,
                    unavailable: [
                        { symbol: 'YM38O', message: 'Not available with the connected plan' },
                    ],
                }}
                widget={widget}
                onPeriodChange={vi.fn()}
                periodUpdating={false}
            />,
        );
        expect(screen.queryByText(/Unavailable:/)).not.toBeInTheDocument();
        expect(screen.getByTestId('stock-line-AAPL')).toBeInTheDocument();
        expect(screen.getByTestId('stock-line-NVDA')).toBeInTheDocument();
    });

    it('toggles one curve without hiding the other', () => {
        render(
            <StockMarketWidget
                data={data}
                widget={widget}
                selectedPeriod="1M"
                onPeriodChange={vi.fn()}
                periodUpdating={false}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'AAPL', pressed: true }));

        expect(screen.queryByTestId('stock-line-AAPL')).not.toBeInTheDocument();
        expect(screen.getByTestId('stock-line-NVDA')).toBeInTheDocument();
    });

    it.each(['1Y', '5Y'])('requests a %s period change from the chart controls', (period) => {
        const onPeriodChange = vi.fn();
        render(
            <StockMarketWidget
                data={data}
                widget={widget}
                selectedPeriod="1M"
                onPeriodChange={onPeriodChange}
                periodUpdating={false}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: period }));

        expect(onPeriodChange).toHaveBeenCalledWith(period);
    });

    it('does not crash on ALL history with invalid or missing timestamps', () => {
        const allData: StockMarketData = {
            ...data,
            period: 'ALL',
            series: data.series.map((series) => ({
                ...series,
                prices: [{ timestamp: Number.NaN, price: series.currentPrice }],
            })),
        };

        render(
            <StockMarketWidget
                data={allData}
                widget={widget}
                selectedPeriod="ALL"
                onPeriodChange={vi.fn()}
                periodUpdating={false}
            />,
        );

        expect(screen.getByTestId('stock-market')).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: 'Stock performance comparison chart' }),
        ).toBeInTheDocument();
    });

    it('draws ALL histories across decades with valid curve coordinates and year labels', () => {
        const allData: StockMarketData = {
            ...data,
            period: 'ALL',
            series: data.series.map((series, index) => ({
                ...series,
                prices: [
                    {
                        timestamp: Date.parse(index === 0 ? '1980-12-12' : '1999-01-22'),
                        price: 0.13,
                    },
                    { timestamp: Date.parse('2026-10-01'), price: series.currentPrice },
                ],
            })),
        };

        render(
            <StockMarketWidget
                data={allData}
                widget={widget}
                selectedPeriod="ALL"
                onPeriodChange={vi.fn()}
                periodUpdating={false}
            />,
        );

        for (const series of allData.series) {
            const path = screen.getByTestId(`stock-line-${series.symbol}`).getAttribute('d');
            expect(path).toMatch(/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/);
        }
        expect(screen.getByText('1980')).toBeInTheDocument();
        expect(screen.getByText('2026')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'ALL', pressed: true })).toBeInTheDocument();
    });
});
