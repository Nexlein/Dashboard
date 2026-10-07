import { locale, formatNumber, formatPeriod } from '@/i18n/format';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import type { WidgetViewProps } from '@/features/widgets/lib/types';

type PricePoint = { timestamp: number; price: number };

export type StockMarketData = {
    period: '1W' | '1M' | '1Y' | '5Y' | 'ALL';
    unavailable?: { symbol: string; message: string }[];
    series: {
        symbol: string;
        name: string;
        currency: string;
        exchange: string | null;
        logo: string | null;
        currentPrice: number;
        change: number | null;
        prices: PricePoint[];
    }[];
};

type ChartPoint = PricePoint & { change: number };
type ChartBounds = {
    minTime: number;
    maxTime: number;
    minValue: number;
    maxValue: number;
};

const WIDTH = 720;
const HEIGHT = 250;
const MARGIN = { top: 12, right: 16, bottom: 34, left: 48 };
const COLORS = [
    '#2563eb',
    '#f97316',
    '#10b981',
    '#a855f7',
    '#ec4899',
    '#eab308',
    '#06b6d4',
    '#f43f5e',
];
const PERIODS = ['1W', '1M', '1Y', '5Y', 'ALL'] as const;

function symbolColor(symbol: string, index: number) {
    const seed = [...symbol].reduce((total, character) => total + character.charCodeAt(0), 0);
    return COLORS[seed % COLORS.length] || COLORS[index % COLORS.length];
}

function StockLogo({
    symbol,
    logo,
    color,
}: {
    symbol: string;
    logo: string | null;
    color: string;
}) {
    const [failed, setFailed] = useState(false);
    if (logo && !failed) {
        return (
            <img
                src={logo}
                alt=""
                data-testid={`stock-logo-${symbol}`}
                className="size-6 shrink-0 rounded-md object-contain"
                loading="lazy"
                onError={() => setFailed(true)}
            />
        );
    }
    return (
        <span
            data-testid={`stock-logo-${symbol}`}
            className="flex size-6 shrink-0 items-center justify-center rounded-md border-2 bg-muted text-[9px] font-bold text-foreground"
            style={{ borderColor: color }}
            aria-hidden="true"
        >
            {symbol.slice(0, 2)}
        </span>
    );
}

function currencyValue(value: number, currency: string) {
    try {
        return new Intl.NumberFormat(locale(), {
            style: 'currency',
            currency,
            maximumFractionDigits: value < 1 ? 4 : 2,
        }).format(value);
    } catch {
        return `${formatNumber(value)} ${currency}`;
    }
}

function dateLabel(timestamp: number, period: StockMarketData['period']) {
    const options: Intl.DateTimeFormatOptions =
        period === '1W'
            ? { weekday: 'short', hour: '2-digit' }
            : period === '5Y' || period === 'ALL'
              ? { year: 'numeric' }
              : { month: 'short', day: 'numeric' };
    if (!Number.isFinite(timestamp)) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale(), options).format(date);
}

function chartPath(points: ChartPoint[], bounds: ChartBounds) {
    const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const timeRange = Math.max(bounds.maxTime - bounds.minTime, 1);
    const valueRange = Math.max(bounds.maxValue - bounds.minValue, 1);

    return points
        .map((point, index) => {
            const x = MARGIN.left + ((point.timestamp - bounds.minTime) / timeRange) * plotWidth;
            const y = MARGIN.top + (1 - (point.change - bounds.minValue) / valueRange) * plotHeight;
            return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');
}

export function StockMarketWidget({
    data,
    selectedPeriod,
    onPeriodChange,
    periodUpdating,
}: WidgetViewProps<StockMarketData>) {
    useTranslation();
    const [hiddenSymbols, setHiddenSymbols] = useState(() => new Set<string>());
    const activePeriod = String(selectedPeriod ?? data.period).toUpperCase();
    const normalizedSeries = useMemo(
        () =>
            data.series.map((series, index) => {
                const validPrices = (Array.isArray(series.prices) ? series.prices : []).filter(
                    (point) =>
                        Number.isFinite(point?.timestamp) &&
                        Number.isFinite(point?.price) &&
                        point.price > 0,
                );
                const firstPrice = validPrices[0]?.price || 1;
                return {
                    ...series,
                    color: symbolColor(series.symbol, index),
                    points: validPrices.map((point) => ({
                        ...point,
                        change: ((point.price - firstPrice) / firstPrice) * 100,
                    })),
                };
            }),
        [data.series],
    );
    const visibleSeries = normalizedSeries.filter((series) => !hiddenSymbols.has(series.symbol));
    const allPoints = visibleSeries.flatMap((series) => series.points);
    const allTimestamps = normalizedSeries.flatMap((series) =>
        series.points.map((point) => point.timestamp),
    );
    const minTime = allTimestamps.length ? Math.min(...allTimestamps) : 0;
    const maxTime = allTimestamps.length ? Math.max(...allTimestamps) : minTime + 1;
    const rawMin = allPoints.length ? Math.min(0, ...allPoints.map((point) => point.change)) : -5;
    const rawMax = allPoints.length ? Math.max(0, ...allPoints.map((point) => point.change)) : 5;
    const padding = Math.max((rawMax - rawMin) * 0.1, 1);
    const bounds = {
        minTime,
        maxTime,
        minValue: rawMin - padding,
        maxValue: rawMax + padding,
    };
    const yTicks = Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;
        return bounds.maxValue - ratio * (bounds.maxValue - bounds.minValue);
    });
    const xTicks = Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;
        return minTime + ratio * (maxTime - minTime);
    });

    function toggleSymbol(symbol: string) {
        setHiddenSymbols((current) => {
            const next = new Set(current);
            if (next.has(symbol)) next.delete(symbol);
            else next.add(symbol);
            return next;
        });
    }

    return (
        <div
            className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden"
            data-testid="stock-market"
        >
            <div className="grid shrink-0 auto-cols-[minmax(120px,1fr)] grid-flow-col overflow-x-auto rounded-lg border bg-muted/20">
                {normalizedSeries.map((series) => {
                    const change = series.change ?? 0;
                    const positive = change >= 0;
                    return (
                        <div key={series.symbol} className="min-w-0 border-r p-3 last:border-r-0">
                            <div className="flex items-center gap-2">
                                <StockLogo
                                    symbol={series.symbol}
                                    logo={series.logo}
                                    color={series.color}
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold">
                                        {series.symbol}
                                    </p>
                                    <p
                                        className="truncate text-[10px] text-muted-foreground"
                                        title={series.name}
                                    >
                                        {series.name}
                                    </p>
                                </div>
                            </div>
                            <p className="mt-1 truncate text-sm font-semibold">
                                {currencyValue(series.currentPrice, series.currency)}
                            </p>
                            <p
                                className={`mt-0.5 text-xs font-medium ${
                                    positive
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-red-700 dark:text-red-400'
                                }`}
                            >
                                {positive ? '↑' : '↓'}{' '}
                                {formatNumber(Math.abs(change), {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                                %
                            </p>
                        </div>
                    );
                })}
            </div>

            <div
                className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/15 p-1.5"
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
            >
                <div className="flex flex-wrap items-center gap-1">
                    {normalizedSeries.map((series) => {
                        const hidden = hiddenSymbols.has(series.symbol);
                        return (
                            <button
                                key={series.symbol}
                                type="button"
                                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                    hidden
                                        ? 'text-muted-foreground opacity-45'
                                        : 'bg-background text-foreground shadow-sm'
                                }`}
                                aria-pressed={!hidden}
                                onClick={() => toggleSymbol(series.symbol)}
                            >
                                <span
                                    className="h-0.5 w-3 rounded-full"
                                    style={{ backgroundColor: series.color }}
                                />
                                {series.symbol}
                            </button>
                        );
                    })}
                </div>
                <div
                    className="flex items-center rounded-md bg-muted p-0.5"
                    aria-label={i18n.t('markets:stockPeriod')}
                >
                    {PERIODS.map((period) => (
                        <button
                            key={period}
                            type="button"
                            className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                activePeriod === period
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            aria-pressed={activePeriod === period}
                            disabled={periodUpdating}
                            onClick={() => onPeriodChange(period)}
                        >
                            {formatPeriod(period)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-md">
                <svg
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    className="h-full min-h-32 w-full"
                    role="img"
                    aria-label={i18n.t('markets:stockChart')}
                >
                    {yTicks.map((tick) => {
                        const y =
                            MARGIN.top +
                            ((bounds.maxValue - tick) / (bounds.maxValue - bounds.minValue)) *
                                (HEIGHT - MARGIN.top - MARGIN.bottom);
                        return (
                            <g key={tick}>
                                <line
                                    x1={MARGIN.left}
                                    x2={WIDTH - MARGIN.right}
                                    y1={y}
                                    y2={y}
                                    className="stroke-border"
                                    strokeDasharray="4 5"
                                />
                                <text
                                    x={MARGIN.left - 8}
                                    y={y + 4}
                                    textAnchor="end"
                                    className="fill-muted-foreground text-[11px]"
                                >
                                    {formatNumber(tick, { maximumFractionDigits: 0 })}%
                                </text>
                            </g>
                        );
                    })}
                    {xTicks.map((tick) => {
                        const x =
                            MARGIN.left +
                            ((tick - minTime) / Math.max(maxTime - minTime, 1)) *
                                (WIDTH - MARGIN.left - MARGIN.right);
                        return (
                            <text
                                key={tick}
                                x={x}
                                y={HEIGHT - 8}
                                textAnchor="middle"
                                className="fill-muted-foreground text-[11px]"
                            >
                                {dateLabel(tick, data.period)}
                            </text>
                        );
                    })}
                    {visibleSeries.map((series) => (
                        <path
                            key={series.symbol}
                            data-testid={`stock-line-${series.symbol}`}
                            d={chartPath(series.points, bounds)}
                            fill="none"
                            stroke={series.color}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                    {!visibleSeries.length && (
                        <text
                            x={WIDTH / 2}
                            y={HEIGHT / 2}
                            textAnchor="middle"
                            className="fill-muted-foreground text-sm"
                        >
                            {i18n.t('markets:selectStock')}
                        </text>
                    )}
                </svg>
            </div>
        </div>
    );
}
