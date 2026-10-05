import type { WidgetViewProps } from '@/features/widgets/lib/types';

export type CryptoPriceData = {
    coin: string;
    currency: string;
    price: number;
    marketCap: number | null;
    volume24h: number | null;
    change24h: number | null;
    lastUpdatedAt: number | null;
};

function formatCurrency(value: number | null, currency: string, compact = false) {
    if (typeof value !== 'number') return '—';

    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency.toUpperCase(),
            notation: compact ? 'compact' : 'standard',
            maximumFractionDigits: compact ? 2 : value < 1 ? 6 : 2,
        }).format(value);
    } catch {
        return `${value.toLocaleString()} ${currency.toUpperCase()}`;
    }
}

export function CryptoPrice({ data }: WidgetViewProps<CryptoPriceData>) {
    const change = typeof data.change24h === 'number' ? data.change24h : null;
    const isPositive = change !== null && change >= 0;

    return (
        <div
            className="flex h-full w-full flex-col justify-between gap-4"
            data-testid="crypto-price"
        >
            <div>
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium capitalize">
                        {data.coin.replaceAll('-', ' ')}
                    </p>
                    {change !== null && (
                        <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                isPositive
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}
                        >
                            {isPositive ? '+' : ''}
                            {change.toFixed(2)}%
                        </span>
                    )}
                </div>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {formatCurrency(data.price, data.currency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">24-hour market change</p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                <div>
                    <p className="text-xs text-muted-foreground">Market cap</p>
                    <p className="font-medium">
                        {formatCurrency(data.marketCap, data.currency, true)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">24h volume</p>
                    <p className="font-medium">
                        {formatCurrency(data.volume24h, data.currency, true)}
                    </p>
                </div>
            </div>
        </div>
    );
}
