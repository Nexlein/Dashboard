import { formatDate, formatNumber } from '@/i18n/format';
import { weatherDescription } from '@/i18n/weather';
import { useTranslation } from 'react-i18next';
import { Droplets, Wind } from 'lucide-react';
import type { WidgetViewProps } from '@/features/widgets/lib/types';

type WeatherLocation = { name: string; country: string };

export type CurrentWeatherData = {
    location: WeatherLocation;
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number | null;
    condition: string;
    conditionCode?: number | null;
    icon: string;
};

export type ForecastData = {
    location: WeatherLocation;
    days: {
        date: string;
        min: number;
        max: number;
        condition: string;
        conditionCode?: number | null;
        icon: string;
    }[];
};

function WeatherIcon({ code, description }: { code: string; description: string }) {
    if (!code) return null;
    return (
        <img
            src={`https://openweathermap.org/img/wn/${code}@2x.png`}
            alt={description}
            className="h-16 w-16"
        />
    );
}

export function CurrentWeather({ data }: WidgetViewProps<CurrentWeatherData>) {
    const { t } = useTranslation('weather');
    const description = weatherDescription(data.conditionCode, data.icon, t);
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
                    <p className="text-4xl font-semibold tracking-tight">
                        {formatNumber(data.temperature)}°C
                    </p>
                    <p className="text-sm capitalize">{description}</p>
                </div>
                <WeatherIcon code={data.icon} description={description} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>{t('feelsLike', { temperature: formatNumber(data.feelsLike) })}</span>
                <span className="flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    {formatNumber(data.humidity)}%
                </span>
                <span className="flex items-center gap-1">
                    <Wind className="h-3 w-3" />
                    {data.windSpeed === null ? '—' : formatNumber(data.windSpeed)} m/s
                </span>
            </div>
        </div>
    );
}

export function Forecast({ data }: WidgetViewProps<ForecastData>) {
    const { t } = useTranslation('weather');
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
                            {formatDate(new Date(`${day.date}T12:00:00`), { weekday: 'short' })}
                        </span>
                        <WeatherIcon
                            code={day.icon}
                            description={weatherDescription(day.conditionCode, day.icon, t)}
                        />
                        <span className="text-sm font-semibold">{formatNumber(day.max)}°</span>
                        <span className="text-xs text-muted-foreground">
                            {formatNumber(day.min)}°
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
