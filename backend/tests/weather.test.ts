import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { stubFetch } from './helpers.ts';
import weather from '../src/services/weather.ts';

describe('Weather service', () => {
    let fetchMock: Mock;
    const connectionOptions = {
        credentials: { apiKey: 'test-key' },
        cacheScope: 'user-1',
    };

    beforeEach(() => {
        weather.clearCache();
        fetchMock = stubFetch();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('normalizes current weather and caches it by city', async () => {
        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 }],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    dt: 123,
                    main: { temp: 18.6, feels_like: 18.1, humidity: 70 },
                    wind: { speed: 3.2 },
                    weather: [{ description: 'clear sky', icon: '01d' }],
                }),
            });

        const first = await weather.execute(
            'current_weather',
            { city: ' Paris ' },
            connectionOptions,
        );
        const second = await weather.execute(
            'current_weather',
            { city: 'paris' },
            connectionOptions,
        );

        expect(first).toEqual({
            type: 'current_weather',
            location: { name: 'Paris', country: 'FR' },
            observedAt: 123,
            temperature: 19,
            feelsLike: 18,
            humidity: 70,
            windSpeed: 3.2,
            condition: 'clear sky',
            icon: '01d',
        });
        expect(second).toEqual(first);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not share cached weather between user connections', async () => {
        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 }],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    dt: 123,
                    main: { temp: 19, feels_like: 19, humidity: 70 },
                    wind: { speed: 3 },
                    weather: [{ description: 'clear sky', icon: '01d' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 }],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    dt: 124,
                    main: { temp: 20, feels_like: 20, humidity: 68 },
                    wind: { speed: 2 },
                    weather: [{ description: 'clear sky', icon: '01d' }],
                }),
            });

        const firstUser = await weather.execute(
            'current_weather',
            { city: 'Paris' },
            connectionOptions,
        );
        const secondUser = await weather.execute(
            'current_weather',
            { city: 'Paris' },
            {
                credentials: { apiKey: 'another-test-key' },
                cacheScope: 'user-2',
            },
        );

        expect(firstUser).toHaveProperty('observedAt', 123);
        expect(secondUser).toHaveProperty('observedAt', 124);
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('expires cached data at the configured refresh interval', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(0);
        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 }],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    dt: 123,
                    main: { temp: 18.6, feels_like: 18, humidity: 70 },
                    wind: { speed: 3 },
                    weather: [{ description: 'clear sky', icon: '01d' }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 }],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    dt: 183,
                    main: { temp: 20, feels_like: 20, humidity: 65 },
                    wind: { speed: 2 },
                    weather: [{ description: 'clear sky', icon: '01d' }],
                }),
            });

        const first = await weather.execute(
            'current_weather',
            { city: 'Paris' },
            { ...connectionOptions, refreshRate: 60 },
        );
        vi.spyOn(Date, 'now').mockReturnValue(59_000);
        const cached = await weather.execute(
            'current_weather',
            { city: 'Paris' },
            { ...connectionOptions, refreshRate: 60 },
        );
        vi.spyOn(Date, 'now').mockReturnValue(60_000);
        const refreshed = await weather.execute(
            'current_weather',
            { city: 'Paris' },
            { ...connectionOptions, refreshRate: 60 },
        );

        expect(cached).toEqual(first);
        expect(refreshed).toHaveProperty('observedAt', 183);
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('supports the legacy weather-current widget name', async () => {
        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 }],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    dt: 123,
                    main: { temp: 19, feels_like: 18, humidity: 70 },
                    wind: { speed: 3 },
                    weather: [{ description: 'clear sky', icon: '01d' }],
                }),
            });

        const result = await weather.execute(
            'weather-current',
            { city: 'Paris' },
            connectionOptions,
        );

        expect(result).toHaveProperty('type', 'current_weather');
    });

    it('returns a clear error when the city cannot be resolved', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: async () => [] });

        await expect(
            weather.execute('forecast', { city: 'Unknown' }, connectionOptions),
        ).rejects.toMatchObject({ message: 'City not found', statusCode: 404 });
    });

    it('reports an invalid or inactive API key clearly', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 401 });

        await expect(
            weather.execute('forecast', { city: 'Paris' }, connectionOptions),
        ).rejects.toMatchObject({
            message: 'Weather API key is invalid or not active yet',
            statusCode: 503,
        });
    });

    it('retries once after a transient provider network error', async () => {
        fetchMock
            .mockRejectedValueOnce(new Error('temporary network failure'))
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 }],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    dt: 123,
                    main: { temp: 19, feels_like: 19, humidity: 70 },
                    wind: { speed: 3 },
                    weather: [{ description: 'clear sky', icon: '01d' }],
                }),
            });

        const result = await weather.execute(
            'current_weather',
            { city: 'Paris' },
            connectionOptions,
        );

        expect(result).toHaveProperty('temperature', 19);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('aggregates three-hour forecast entries into daily values', async () => {
        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ name: 'Paris', country: 'FR', lat: 48.85, lon: 2.35 }],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    city: { timezone: 7200 },
                    list: [
                        {
                            dt: 1789977600,
                            main: { temp_min: 11, temp_max: 17 },
                            pop: 0.2,
                            weather: [{ description: 'cloudy', icon: '03d' }],
                        },
                        {
                            dt: 1790010000,
                            main: { temp_min: 9, temp_max: 21 },
                            pop: 0.6,
                            weather: [{ description: 'sunny', icon: '01d' }],
                        },
                    ],
                }),
            });

        const result = await weather.execute('forecast', { city: 'Paris' }, connectionOptions);

        expect(result).toHaveProperty('type', 'forecast');
        expect(result).toMatchObject({ days: [expect.objectContaining({ min: 9, max: 21 })] });
    });
});
