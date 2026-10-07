import { locale, formatNumber } from '@/i18n/format';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import type { WidgetViewProps } from '@/features/widgets/lib/types';

type PricePoint = { timestamp: number; price: number };

export type CryptoChartData = {
    currency: string;
    days: number;
    historyLimited: boolean;
    series: {
        coin: string;
        name?: string;
        symbol?: string;
        image?: string | null;
        currentPrice: number;
        /** null when the first price of the period is 0. */
        change: number | null;
        prices: PricePoint[];
    }[];
};

type ChartPoint = PricePoint & { change: number };
type ChartBounds = { minTime: number; maxTime: number; minValue: number; maxValue: number };

const WIDTH = 720;
const HEIGHT = 250;
const MARGIN = { top: 12, right: 16, bottom: 34, left: 48 };
const COIN_META: Record<string, { symbol: string; color: string }> = {
    bitcoin: { symbol: 'BTC', color: '#f59e0b' },
    ethereum: { symbol: 'ETH', color: '#3b82f6' },
    solana: { symbol: 'SOL', color: '#22c55e' },
    binancecoin: { symbol: 'BNB', color: '#eab308' },
    ripple: { symbol: 'XRP', color: '#8b5cf6' },
    cardano: { symbol: 'ADA', color: '#06b6d4' },
};
const FALLBACK_COLORS = [
    '#f97316',
    '#0ea5e9',
    '#10b981',
    '#a855f7',
    '#ec4899',
    '#84cc16',
    '#f43f5e',
    '#14b8a6',
];
const PERIODS = [
    {
        value: '7',
        get label() {
            return i18n.t('markets:week');
        },
    },
    {
        value: '30',
        get label() {
            return i18n.t('markets:month');
        },
    },
    {
        value: '90',
        get label() {
            return i18n.t('markets:threeMonths');
        },
    },
    {
        value: '365',
        get label() {
            return i18n.t('markets:year');
        },
    },
];

function coinMeta(coin: string, index: number) {
    const colorIndex = [...coin].reduce((total, character) => total + character.charCodeAt(0), 0);
    return (
        COIN_META[coin] || {
            symbol: coin.slice(0, 4).toUpperCase(),
            color: FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length] || FALLBACK_COLORS[index],
        }
    );
}

function CoinLogo({
    series,
    className = 'size-5',
}: {
    series: { coin: string; color: string; image?: string | null };
    className?: string;
}) {
    const [failed, setFailed] = useState(false);

    if (series.image && !failed) {
        return (
            <img
                src={series.image}
                alt=""
                data-testid={`crypto-logo-${series.coin}`}
                className={`${className} shrink-0 rounded-full object-contain`}
                loading="lazy"
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <span
            data-testid={`crypto-logo-${series.coin}`}
            className={`${className} shrink-0 rounded-full`}
            style={{ backgroundColor: series.color }}
            aria-hidden="true"
        />
    );
}

function currencyValue(value: number, currency: string) {
    try {
        return new Intl.NumberFormat(locale(), {
            style: 'currency',
            currency: currency.toUpperCase(),
            maximumFractionDigits: value < 1 ? 6 : 2,
        }).format(value);
    } catch {
        return `${formatNumber(value)} ${currency.toUpperCase()}`;
    }
}

function dateLabel(timestamp: number, days: number) {
    return new Intl.DateTimeFormat(locale(), {
        ...(days <= 1
            ? { hour: '2-digit', minute: '2-digit' }
            : { month: 'short', day: 'numeric' }),
    }).format(new Date(timestamp));
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

export function CryptoChartWidget({
    data,
    selectedPeriod,
    onPeriodChange,
    periodUpdating,
}: WidgetViewProps<CryptoChartData>) {
    useTranslation();
    const [hiddenCoins, setHiddenCoins] = useState(() => new Set<string>());
    const activePeriod =
        String(selectedPeriod ?? data.days) === 'max' ? '365' : String(selectedPeriod ?? data.days);
    const normalizedSeries = useMemo(
        () =>
            data.series.map((series, index) => {
                const firstPrice = series.prices[0]?.price || 1;
                return {
                    ...coinMeta(series.coin, index),
                    ...series,
                    points: series.prices.map((point) => ({
                        ...point,
                        change: ((point.price - firstPrice) / firstPrice) * 100,
                    })),
                };
            }),
        [data.series],
    );
    const visibleSeries = normalizedSeries.filter((series) => !hiddenCoins.has(series.coin));
    const allPoints = visibleSeries.flatMap((series) => series.points);
    const allTimestamps = normalizedSeries.flatMap((series) =>
        series.points.map((point) => point.timestamp),
    );
    const minTime = Math.min(...allTimestamps);
    const maxTime = Math.max(...allTimestamps);
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

    function toggleCoin(coin: string) {
        setHiddenCoins((current) => {
            const next = new Set(current);
            if (next.has(coin)) next.delete(coin);
            else next.add(coin);
            return next;
        });
    }

    return (
        <div
            className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden"
            data-testid="crypto-chart"
        >
            <div className="grid shrink-0 auto-cols-[minmax(112px,1fr)] grid-flow-col overflow-x-auto rounded-lg border bg-muted/20">
                {normalizedSeries.map((series) => {
                    const change = series.change ?? 0;
                    const positive = change >= 0;
                    return (
                        <div key={series.coin} className="min-w-0 border-r p-3 last:border-r-0">
                            <div className="flex items-center gap-2">
                                <CoinLogo series={series} className="size-5" />
                                <span
                                    className="truncate text-xs font-semibold"
                                    title={series.name || series.coin}
                                >
                                    {series.symbol}
                                </span>
                            </div>
                            <p className="mt-1 truncate text-sm font-semibold">
                                {currencyValue(series.currentPrice, data.currency)}
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

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/15 p-1.5">
                <div className="flex flex-wrap items-center gap-1">
                    {normalizedSeries.map((series) => {
                        const hidden = hiddenCoins.has(series.coin);
                        return (
                            <button
                                key={series.coin}
                                type="button"
                                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                    hidden
                                        ? 'text-muted-foreground opacity-45'
                                        : 'bg-background text-foreground shadow-xs'
                                }`}
                                aria-pressed={!hidden}
                                onClick={() => toggleCoin(series.coin)}
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
                <div className="flex items-center">
                    <div
                        className="flex items-center rounded-md bg-muted p-0.5"
                        aria-label={i18n.t('markets:chartPeriod')}
                    >
                        {PERIODS.map((period) => {
                            const active = activePeriod === period.value;
                            return (
                                <button
                                    key={period.value}
                                    type="button"
                                    className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                        active
                                            ? 'bg-background text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    aria-pressed={active}
                                    disabled={periodUpdating}
                                    onClick={() => onPeriodChange(period.value)}
                                >
                                    {period.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-md">
                <svg
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    className="h-full min-h-32 w-full"
                    role="img"
                    aria-label={i18n.t('markets:cryptoChart')}
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
                                {dateLabel(tick, data.days)}
                            </text>
                        );
                    })}
                    {visibleSeries.map((series) => (
                        <path
                            key={series.coin}
                            data-testid={`crypto-line-${series.coin}`}
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
                            {i18n.t('markets:selectMarket')}
                        </text>
                    )}
                </svg>
            </div>
        </div>
    );
}
