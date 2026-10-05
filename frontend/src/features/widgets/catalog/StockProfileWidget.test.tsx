import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeWidget } from '@/test/fixtures';
import { StockProfileWidget } from './StockProfileWidget';
import type { StockMarketData } from './StockMarketWidget';

const data: StockMarketData = {
    period: '1M',
    series: [
        {
            symbol: 'AAPL',
            name: 'Apple Inc',
            currency: 'USD',
            exchange: 'NASDAQ',
            logo: null,
            currentPrice: 120,
            change: -2.5,
            prices: [
                { timestamp: Date.parse('2026-09-01'), price: 100 },
                { timestamp: Date.parse('2026-10-01'), price: 120 },
            ],
        },
    ],
};
const props = {
    widget: makeWidget({ serviceName: 'stocks', widgetName: 'stock_profile' }),
    data,
    onPeriodChange: vi.fn(),
    periodUpdating: false,
};

describe('StockProfileWidget', () => {
    it('separates daily change from selected-period performance and draws a valid price curve', () => {
        render(<StockProfileWidget {...props} />);
        expect(screen.getByText('Apple Inc')).toBeInTheDocument();
        expect(screen.getByText('-2.50%')).toBeInTheDocument();
        expect(screen.getByText('+20.00%')).toBeInTheDocument();
        expect(screen.getByTestId('stock-profile-line').getAttribute('d')).toMatch(
            /^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/,
        );
        expect(screen.getByTestId('stock-profile-line')).toHaveAttribute('stroke', '#10b981');
    });
    it('requests a period change and prevents repeated changes while saving', () => {
        const onPeriodChange = vi.fn();
        const { rerender } = render(
            <StockProfileWidget {...props} onPeriodChange={onPeriodChange} />,
        );
        fireEvent.click(screen.getByRole('button', { name: '5Y' }));
        expect(onPeriodChange).toHaveBeenCalledWith('5Y');
        rerender(<StockProfileWidget {...props} periodUpdating />);
        expect(screen.getByRole('button', { name: 'ALL' })).toBeDisabled();
    });
    it('shows an honest empty state for invalid history and unknown daily change', () => {
        render(
            <StockProfileWidget
                {...props}
                data={{
                    ...data,
                    series: [
                        { ...data.series[0], change: null, prices: [{ timestamp: NaN, price: 0 }] },
                    ],
                }}
            />,
        );
        expect(screen.getByText('No price history available for this period.')).toBeInTheDocument();
        expect(screen.queryByTestId('stock-profile-line')).toBeNull();
        expect(screen.queryByText('+0.00%')).toBeNull();
    });
});
