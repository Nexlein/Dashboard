import { Droplets, Wind } from 'lucide-react';

export function WeatherIcon({ code, description }) {
    if (!code) return null;
    return (
        <img
            src={`https://openweathermap.org/img/wn/${code}@2x.png`}
            alt={description}
            className="h-16 w-16"
        />
    );
}

export function CurrentWeather({ data }) {
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

export function Forecast({ data }) {
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
