import { useState, useCallback, useEffect } from 'react';
import { useWidgetTimer } from '@/lib/useWidgetTimer';
import { Droplets, Loader2, Wind } from 'lucide-react';
import { fetchWidgetData } from '@/lib/widgets';
import {
    GithubRepoWidget,
    GithubProfileWidget,
    GithubCommitsWidget,
} from './widgets/GithubWidgets';

function WeatherIcon({ code, description }) {
    if (!code) return null;
    return (
        <img
            src={`https://openweathermap.org/img/wn/${code}@2x.png`}
            alt={description}
            className="h-16 w-16"
        />
    );
}

function CurrentWeather({ data }) {
    return (
        <div
            className="flex h-full w-full flex-col justify-between gap-3"
            data-testid="current-weather"
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">
                        {data.location.name}, {data.location.country}
                    </p>
                    <p className="text-4xl font-semibold tracking-tight">{data.temperature}°C</p>
                    <p className="text-sm capitalize">{data.condition}</p>
                </div>
                <WeatherIcon code={data.icon} description={data.condition} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>Feels {data.feelsLike}°C</span>
                <span className="flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    {data.humidity}%
                </span>
                <span className="flex items-center gap-1">
                    <Wind className="h-3 w-3" />
                    {data.windSpeed} m/s
                </span>
            </div>
        </div>
    );
}

function Forecast({ data }) {
    return (
        <div className="h-full w-full" data-testid="weather-forecast">
            <p className="mb-3 text-sm text-muted-foreground">
                {data.location.name}, {data.location.country}
            </p>
            <div className="grid grid-cols-5 gap-2">
                {data.days.map((day) => (
                    <div
                        key={day.date}
                        className="flex flex-col items-center rounded-md bg-muted/60 p-2 text-center"
                    >
                        <span className="text-xs font-medium">
                            {new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
                                new Date(`${day.date}T12:00:00`),
                            )}
                        </span>
                        <WeatherIcon code={day.icon} description={day.condition} />
                        <span className="text-sm font-semibold">{day.max}°</span>
                        <span className="text-xs text-muted-foreground">{day.min}°</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatCurrency(value, currency, compact = false) {
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

function CryptoPrice({ data }) {
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

export default function WidgetRenderer({ widget }) {
    const { id, serviceName, widgetName, refreshRate } = widget;
    const isCryptoWidget = serviceName === 'crypto' && widgetName === 'crypto_price';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            setData(await fetchWidgetData(id));
        } catch (err) {
            setError(err.message || 'Failed to fetch widget data');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const isSupportedService = ['weather', 'github', 'crypto'].includes(serviceName);
    useWidgetTimer(isSupportedService ? refreshRate : 0, fetchData);

    // Refetch when params change via editing
    useEffect(() => {
        if (isSupportedService) fetchData();
    }, [widget.params, fetchData, isSupportedService]);

    if (!isSupportedService) {
        return (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                This service is not implemented yet.
            </div>
        );
    }

    if (error) {
        const needsServiceConnection = error.includes('Configure it in Services');
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <p className="text-destructive text-sm font-medium">Error loading {widgetName}</p>
                <p className="text-muted-foreground text-xs mt-1">{error}</p>
                {needsServiceConnection && (
                    <a
                        href="/services"
                        className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Open Services
                    </a>
                )}
            </div>
        );
    }

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (['current_weather', 'weather-current'].includes(widgetName)) {
        return <CurrentWeather data={data} />;
    }
    if (['forecast', 'weather-forecast'].includes(widgetName)) return <Forecast data={data} />;
    if (isCryptoWidget) return <CryptoPrice data={data} />;

    if (['repo_stats', 'github-repo'].includes(widgetName)) return <GithubRepoWidget data={data} />;
    if (['latest_commits', 'github-commits'].includes(widgetName))
        return <GithubCommitsWidget data={data} />;
    if (['user_profile', 'github-user'].includes(widgetName))
        return <GithubProfileWidget data={data} />;

    return (
        <pre className="h-full w-full overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>
    );
}
