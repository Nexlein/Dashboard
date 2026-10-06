import { locale, formatNumber, formatPeriod } from '@/i18n/format';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useId, useState } from 'react';
import type { WidgetViewProps } from '@/features/widgets/lib/types';
import type { StockMarketData } from './StockMarketWidget';

const PERIODS = ['1W', '1M', '1Y', '5Y', 'ALL'] as const;
const WIDTH = 600;
const HEIGHT = 180;
const PAD = 8;

function money(value: number, currency: string) {
    if (!Number.isFinite(value)) return '—';
    try {
        return new Intl.NumberFormat(locale(), {
            style: 'currency',
            currency,
            maximumFractionDigits: value < 1 ? 4 : 2,
        }).format(value);
    } catch {
        return `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    }
}

function percent(value: number | null) {
    return value !== null && Number.isFinite(value)
        ? `${value >= 0 ? '+' : ''}${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
        : '—';
}

function date(timestamp: number) {
    return new Intl.DateTimeFormat(locale(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(timestamp);
}

export function StockProfileWidget({
    data,
    selectedPeriod,
    onPeriodChange,
    periodUpdating,
}: WidgetViewProps<StockMarketData>) {
    useTranslation();
    const gradientId = useId().replace(/:/g, '');
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const [failedLogo, setFailedLogo] = useState<string | null>(null);
    const stock = data.series[0];
    if (!stock)
        return <p className="text-sm text-muted-foreground">{i18n.t('markets:noCompany')}</p>;

    const points = (Array.isArray(stock.prices) ? stock.prices : [])
        .filter(
            (point) =>
                Number.isFinite(point.timestamp) && Number.isFinite(point.price) && point.price > 0,
        )
        .sort((a, b) => a.timestamp - b.timestamp);
    const first = points[0];
    const last = points.at(-1);
    const low = points.length ? Math.min(...points.map((point) => point.price)) : null;
    const high = points.length ? Math.max(...points.map((point) => point.price)) : null;
    const change = first && last ? (last.price / first.price - 1) * 100 : null;
    const color = change !== null && change < 0 ? '#ef4444' : '#10b981';
    const timeRange = first && last ? Math.max(last.timestamp - first.timestamp, 1) : 1;
    const priceRange = low !== null && high !== null ? Math.max(high - low, high * 0.01, 0.01) : 1;
    const x = (timestamp: number) =>
        PAD + ((timestamp - (first?.timestamp ?? 0)) / timeRange) * (WIDTH - PAD * 2);
    const y = (price: number) => HEIGHT - 20 - ((price - (low ?? 0)) / priceRange) * (HEIGHT - 40);
    const path = points
        .map(
            (point, index) =>
                `${index ? 'L' : 'M'} ${x(point.timestamp).toFixed(2)} ${y(point.price).toFixed(2)}`,
        )
        .join(' ');
    const hovered = hoverIndex === null ? null : points[Math.min(hoverIndex, points.length - 1)];
    const activePeriod = String(selectedPeriod ?? data.period);
    const dailyPositive = stock.change !== null && stock.change >= 0;

    return (
        <div className="flex h-full min-h-0 w-full flex-col gap-3" data-testid="stock-profile">
            <div className="flex shrink-0 items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/30 text-sm font-bold">
                    {stock.logo && failedLogo !== stock.logo ? (
                        <img
                            src={stock.logo}
                            alt=""
                            loading="lazy"
                            className="size-full bg-white p-2 object-contain"
                            onError={() => setFailedLogo(stock.logo)}
                        />
                    ) : (
                        stock.symbol.slice(0, 2)
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tracking-wide">{stock.symbol}</span>
                        <span className="truncate rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {stock.exchange || i18n.t('markets:listedStock')} · {stock.currency}
                        </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground" title={stock.name}>
                        {stock.name}
                    </p>
                </div>
            </div>

            <div className="shrink-0">
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                    {money(stock.currentPrice, stock.currency)}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                    <span
                        className={`rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${stock.change === null ? 'bg-muted text-muted-foreground' : dailyPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}
                    >
                        {percent(stock.change)}
                    </span>
                    <span className="text-muted-foreground">{i18n.t('markets:lastSession')}</span>
                </div>
            </div>

            <div
                className="flex shrink-0 items-center gap-1 rounded-lg bg-muted/50 p-1"
                role="group"
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label={i18n.t('markets:stockPeriod')}
            >
                {PERIODS.map((period) => (
                    <button
                        key={period}
                        type="button"
                        aria-pressed={period === activePeriod}
                        disabled={periodUpdating}
                        onClick={() => {
                            setHoverIndex(null);
                            onPeriodChange(period);
                        }}
                        className={`min-w-0 flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${period === activePeriod ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'}`}
                    >
                        {formatPeriod(period)}
                    </button>
                ))}
            </div>

            <div className="relative flex min-h-24 flex-1 flex-col" style={{ color }}>
                {points.length ? (
                    <>
                        {hovered && (
                            <div
                                className="pointer-events-none absolute left-2 top-0 z-10 rounded-md border bg-background/95 px-2 py-1 text-[10px] text-foreground shadow-sm"
                                role="status"
                            >
                                {date(hovered.timestamp)}{' '}
                                <strong className="ml-1">
                                    {money(hovered.price, stock.currency)}
                                </strong>
                            </div>
                        )}
                        <svg
                            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                            preserveAspectRatio="none"
                            className="min-h-0 w-full flex-1"
                            role="img"
                            aria-label={i18n.t('markets:priceHistory', { symbol: stock.symbol })}
                            onPointerLeave={() => setHoverIndex(null)}
                            onPointerMove={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                if (!rect.width) return;
                                const target =
                                    (first?.timestamp ?? 0) +
                                    Math.max(
                                        0,
                                        Math.min(
                                            1,
                                            (event.clientX -
                                                rect.left -
                                                (PAD / WIDTH) * rect.width) /
                                                ((rect.width * (WIDTH - 2 * PAD)) / WIDTH),
                                        ),
                                    ) *
                                        timeRange;
                                let nearest = 0;
                                points.forEach((point, index) => {
                                    if (
                                        Math.abs(point.timestamp - target) <
                                        Math.abs(points[nearest].timestamp - target)
                                    )
                                        nearest = index;
                                });
                                setHoverIndex(nearest);
                            }}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {[40, 100, 160].map((value) => (
                                <line
                                    key={value}
                                    x1={PAD}
                                    x2={WIDTH - PAD}
                                    y1={value}
                                    y2={value}
                                    className="stroke-border"
                                    strokeDasharray="3 6"
                                />
                            ))}
                            <path
                                d={`${path} L ${x(last!.timestamp)} ${HEIGHT} L ${x(first!.timestamp)} ${HEIGHT} Z`}
                                fill={`url(#${gradientId})`}
                            />
                            <path
                                data-testid="stock-profile-line"
                                d={path}
                                fill="none"
                                stroke={color}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                            {points.length === 1 && (
                                <circle
                                    cx={x(first!.timestamp)}
                                    cy={y(first!.price)}
                                    r="3"
                                    fill={color}
                                />
                            )}
                            {hovered && (
                                <g>
                                    <line
                                        x1={x(hovered.timestamp)}
                                        x2={x(hovered.timestamp)}
                                        y1={PAD}
                                        y2={HEIGHT}
                                        stroke={color}
                                        strokeOpacity="0.4"
                                        strokeDasharray="3 3"
                                    />
                                    <circle
                                        cx={x(hovered.timestamp)}
                                        cy={y(hovered.price)}
                                        r="4"
                                        fill={color}
                                        stroke="var(--background)"
                                        strokeWidth="2"
                                    />
                                </g>
                            )}
                        </svg>
                        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                            <span>{date(first!.timestamp)}</span>
                            <span>{date(last!.timestamp)}</span>
                        </div>
                    </>
                ) : (
                    <p className="m-auto text-xs text-muted-foreground">
                        {i18n.t('markets:noHistory')}
                    </p>
                )}
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-2 border-t pt-2 text-xs">
                <div>
                    <p className="text-[10px] text-muted-foreground">
                        {i18n.t('markets:lowestClose')}
                    </p>
                    <p className="mt-0.5 truncate font-medium tabular-nums">
                        {low === null ? '—' : money(low, stock.currency)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-muted-foreground">
                        {i18n.t('markets:highestClose')}
                    </p>
                    <p className="mt-0.5 truncate font-medium tabular-nums">
                        {high === null ? '—' : money(high, stock.currency)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">
                        {i18n.t('markets:periodChange')}
                    </p>
                    <p
                        className="mt-0.5 font-semibold tabular-nums"
                        style={{ color: change === null ? undefined : color }}
                    >
                        {percent(change)}
                    </p>
                </div>
            </div>
        </div>
    );
}
