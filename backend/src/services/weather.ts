import { cached, clearCache, widgetCacheTtl } from '../utils/redisCache.ts';
import { HttpError } from '../utils/httpError.ts';
import type {
    ServiceContext,
    ServiceCredentials,
    ServiceDefinition,
    WidgetParams,
} from './types.ts';

// The parts of the OpenWeather responses this service reads.
type GeoLocation = { name: string; country: string; state?: string; lat: number; lon: number };
type Conditions = { weather?: { description: string; icon: string }[] };
type CurrentPayload = Conditions & {
    dt: number;
    main: { temp: number; feels_like: number; humidity: number };
    wind?: { speed: number };
};
type ForecastEntry = Conditions & {
    dt: number;
    pop?: number;
    main: { temp_min: number; temp_max: number };
};
type ForecastPayload = { city?: { timezone?: number }; list?: ForecastEntry[] };
type ForecastDay = {
    date: string;
    min: number;
    max: number;
    precipitationProbability: number;
    representative: ForecastEntry;
    distanceFromNoon: number;
};

class WeatherServiceError extends HttpError {
    constructor(message: string, statusCode = 502) {
        super(message, statusCode);
    }
}

function getApiKey(options: Pick<ServiceContext, 'credentials'>): string {
    const apiKey = options?.credentials?.apiKey;
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new WeatherServiceError(
            'OpenWeather is not connected. Configure it in Services.',
            409,
        );
    }
    return apiKey.trim();
}

async function fetchOpenWeather<T>(
    path: string,
    params: Record<string, string>,
    apiKey: string,
): Promise<T> {
    const query = new URLSearchParams({ ...params, appid: apiKey });
    const url = `https://api.openweathermap.org${path}?${query}`;
    let response: Response | undefined;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            response = await fetch(url);
            break;
        } catch {
            if (attempt === 1) {
                throw new WeatherServiceError('Weather provider is unavailable');
            }
        }
    }

    if (!response?.ok) {
        if (response?.status === 401) {
            throw new WeatherServiceError('Weather API key is invalid or not active yet', 503);
        }
        if (response?.status === 429) {
            throw new WeatherServiceError('Weather API rate limit reached', 503);
        }
        throw new WeatherServiceError('Weather provider request failed');
    }

    return (await response.json()) as T;
}

async function resolveCity(city: string, apiKey: string): Promise<GeoLocation> {
    const locations = await fetchOpenWeather<GeoLocation[]>(
        '/geo/1.0/direct',
        { q: city, limit: '1' },
        apiKey,
    );
    if (!locations.length) {
        throw new WeatherServiceError('City not found', 404);
    }
    return locations[0];
}

function locationPayload(location: GeoLocation) {
    return {
        name: location.name,
        country: location.country,
        ...(location.state && { state: location.state }),
    };
}

function aggregateForecast(payload: ForecastPayload, location: GeoLocation) {
    const groups = new Map<string, ForecastDay>();
    const timezone = payload.city?.timezone || 0;

    for (const entry of payload.list || []) {
        const localDate = new Date((entry.dt + timezone) * 1000);
        const date = localDate.toISOString().slice(0, 10);
        const hour = localDate.getUTCHours();
        const existing = groups.get(date) || {
            date,
            min: entry.main.temp_min,
            max: entry.main.temp_max,
            precipitationProbability: 0,
            representative: entry,
            distanceFromNoon: Math.abs(hour - 12),
        };

        existing.min = Math.min(existing.min, entry.main.temp_min);
        existing.max = Math.max(existing.max, entry.main.temp_max);
        existing.precipitationProbability = Math.max(
            existing.precipitationProbability,
            entry.pop || 0,
        );

        const distanceFromNoon = Math.abs(hour - 12);
        if (distanceFromNoon < existing.distanceFromNoon) {
            existing.representative = entry;
            existing.distanceFromNoon = distanceFromNoon;
        }
        groups.set(date, existing);
    }

    return {
        type: 'forecast',
        location: locationPayload(location),
        days: [...groups.values()].slice(0, 5).map((day) => ({
            date: day.date,
            min: Math.round(day.min),
            max: Math.round(day.max),
            precipitationProbability: Math.round(day.precipitationProbability * 100),
            condition: day.representative.weather?.[0]?.description || '',
            icon: day.representative.weather?.[0]?.icon || '',
        })),
    };
}

async function execute(
    widgetName: string,
    params: WidgetParams = {},
    options: Partial<ServiceContext> = {},
): Promise<unknown> {
    const aliases: Record<string, string> = {
        'weather-current': 'current_weather',
        'weather-forecast': 'forecast',
    };
    const normalizedWidgetName = aliases[widgetName] || widgetName;
    const city = typeof params.city === 'string' ? params.city.trim() : '';
    if (!city) throw new WeatherServiceError('City is required', 400);
    if (!['current_weather', 'forecast'].includes(normalizedWidgetName)) {
        throw new WeatherServiceError('Unsupported weather widget', 400);
    }

    const apiKey = getApiKey(options);
    const cacheScope = options.cacheScope || 'unscoped';
    const cacheKey = `${cacheScope}:${normalizedWidgetName}:${city.toLocaleLowerCase()}`;
    return cached(cacheKey, widgetCacheTtl(options.refreshRate), async () => {
        const location = await resolveCity(city, apiKey);
        const commonParams = {
            lat: String(location.lat),
            lon: String(location.lon),
            units: 'metric',
        };
        let data: unknown;

        if (normalizedWidgetName === 'current_weather') {
            const payload = await fetchOpenWeather<CurrentPayload>(
                '/data/2.5/weather',
                commonParams,
                apiKey,
            );
            data = {
                type: 'current_weather',
                location: locationPayload(location),
                observedAt: payload.dt,
                temperature: Math.round(payload.main.temp),
                feelsLike: Math.round(payload.main.feels_like),
                humidity: payload.main.humidity,
                windSpeed: payload.wind?.speed ?? null,
                condition: payload.weather?.[0]?.description || '',
                icon: payload.weather?.[0]?.icon || '',
            };
        } else {
            const payload = await fetchOpenWeather<ForecastPayload>(
                '/data/2.5/forecast',
                commonParams,
                apiKey,
            );
            data = aggregateForecast(payload, location);
        }

        return data;
    });
}

async function verifyCredentials(credentials: ServiceCredentials) {
    const apiKey = getApiKey({ credentials });
    await fetchOpenWeather('/geo/1.0/direct', { q: 'London', limit: '1' }, apiKey);
}

export default {
    name: 'weather',
    displayName: 'OpenWeather',
    description: 'Current weather and forecasts',
    connection: {
        type: 'apiKey',
        label: 'OpenWeather API key',
        documentationUrl: 'https://home.openweathermap.org/api_keys',
    },
    widgets: [
        {
            name: 'current_weather',
            description: 'Displays current temperature for a city',
            params: [{ name: 'city', type: 'string' }],
        },
        {
            name: 'forecast',
            description: 'Displays 5-day weather forecast',
            params: [{ name: 'city', type: 'string' }],
        },
    ],
    execute,
    verifyCredentials,
    WeatherServiceError,
    clearCache,
} satisfies ServiceDefinition & {
    WeatherServiceError: typeof WeatherServiceError;
    clearCache: typeof clearCache;
};
