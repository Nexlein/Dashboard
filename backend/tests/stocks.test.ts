import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StockPendingError } from '../src/services/stockProvider.ts';
import stocks from '../src/services/stocks.ts';
import { getCache, setCache } from '../src/utils/redisCache.ts';

const context = {
    userId: 1,
    credentials: { apiKey: 'twelve-key' },
    cacheScope: 'user-1',
    refreshRate: 60,
};

function response(body: unknown) {
    return { ok: true, status: 200, json: async () => body } as Response;
}

describe('Stock market service quota usage', () => {
    beforeEach(async () => {
        await stocks.clearCache?.();
        vi.restoreAllMocks();
    });

    afterEach(() => vi.useRealTimers());

    it('loads five calendar years of daily history and reuses its cache', async () => {
        await setCache('user-1:stocks:logo:AAPL', { url: null }, 60_000);
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-05T12:00:00Z'));
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(response({ close: '250' }))
            .mockResolvedValueOnce(
                response({
                    values: [
                        { datetime: '2021-10-05', close: '140' },
                        { datetime: '2026-10-05', close: '250' },
                    ],
                }),
            );
        const params = { symbols: 'AAPL', period: '5Y' };

        const result = await stocks.execute?.('stock_market', params, context);
        const repeated = await stocks.execute?.('stock_market', params, context);

        expect(result).toMatchObject({
            period: '5Y',
            series: [
                {
                    symbol: 'AAPL',
                    prices: [
                        { timestamp: Date.parse('2021-10-05'), price: 140 },
                        { timestamp: Date.parse('2026-10-05'), price: 250 },
                    ],
                },
            ],
        });
        expect(repeated).toEqual(result);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const url = new URL(String(fetchMock.mock.calls[1][0]));
        expect(url.searchParams.get('interval')).toBe('1day');
        expect(url.searchParams.get('start_date')).toBe('2021-10-05');
        expect(url.searchParams.get('end_date')).toBe('2026-10-05');
    });

    it('loads only selected company logos and shares their cache with profiles', async () => {
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(
                response({
                    TSLA: { name: 'Tesla', currency: 'USD', close: '450', percent_change: '1.2' },
                    MSFT: {
                        name: 'Microsoft',
                        currency: 'USD',
                        close: '520',
                        percent_change: '-0.4',
                    },
                }),
            )
            .mockResolvedValueOnce(
                response({
                    TSLA: { values: [{ datetime: '2026-10-01', close: '440' }] },
                    MSFT: { values: [{ datetime: '2026-10-01', close: '522' }] },
                }),
            )
            .mockResolvedValueOnce(response({ url: 'https://api.twelvedata.com/logo/tesla.com' }))
            .mockResolvedValueOnce(
                response({ url: 'https://api.twelvedata.com/logo/microsoft.com' }),
            );

        const result = (await stocks.execute?.(
            'stock_market',
            { symbols: 'TSLA,MSFT', period: '1M' },
            context,
        )) as { series: { symbol: string; logo: string | null }[] };

        expect(fetchMock).toHaveBeenCalledTimes(4);
        expect(String(fetchMock.mock.calls[0][0])).toContain('/quote?symbol=TSLA%2CMSFT');
        expect(String(fetchMock.mock.calls[1][0])).toContain('/time_series?symbol=TSLA%2CMSFT');
        expect(
            fetchMock.mock.calls
                .slice(2)
                .map((call) => new URL(String(call[0])).searchParams.get('symbol')),
        ).toEqual(['TSLA', 'MSFT']);
        expect(result.series).toEqual([
            expect.objectContaining({
                symbol: 'TSLA',
                logo: 'https://api.twelvedata.com/logo/tesla.com',
            }),
            expect.objectContaining({
                symbol: 'MSFT',
                logo: 'https://api.twelvedata.com/logo/microsoft.com',
            }),
        ]);
        const repeated = await stocks.execute?.(
            'stock_market',
            { symbols: 'TSLA,MSFT', period: '1M' },
            context,
        );
        expect(repeated).toEqual(result);
        const profile = await stocks.execute?.(
            'stock_profile',
            { symbols: 'MSFT', period: '1M' },
            context,
        );
        expect(profile).toMatchObject({
            series: [{ logo: 'https://api.twelvedata.com/logo/microsoft.com' }],
        });
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('loads and caches branding only for the single selected profile company', async () => {
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(
                response({ name: 'Apple Inc', close: '250', percent_change: '1.5' }),
            )
            .mockResolvedValueOnce(response({ values: [{ datetime: '2026-10-01', close: '240' }] }))
            .mockResolvedValueOnce(response({ url: 'https://api.twelvedata.com/logo/apple.com' }));
        const params = { symbols: 'AAPL', period: '1M' };
        const result = await stocks.execute?.('stock_profile', params, context);
        expect(result).toMatchObject({
            type: 'stock_profile',
            series: [{ symbol: 'AAPL', logo: 'https://api.twelvedata.com/logo/apple.com' }],
        });
        expect(await stocks.execute?.('stock_profile', params, context)).toEqual(result);
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(String(fetchMock.mock.calls[2][0])).toContain('/logo?symbol=AAPL');
    });

    it('keeps profile prices available and caches missing logos when branding is unavailable', async () => {
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(response({ close: '250' }))
            .mockResolvedValueOnce(response({ values: [{ datetime: '2026-10-01', close: '240' }] }))
            .mockResolvedValueOnce(
                response({ status: 'error', code: 403, message: 'Plan unavailable' }),
            );
        const params = { symbols: 'AAPL', period: '1M' };
        expect(await stocks.execute?.('stock_profile', params, context)).toMatchObject({
            series: [{ currentPrice: 250, logo: null }],
        });
        await stocks.execute?.('stock_profile', params, context);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('rejects multiple companies in a profile before consuming provider credits', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch');
        await expect(
            stocks.execute?.('stock_profile', { symbols: 'AAPL,NVDA', period: '1M' }, context),
        ).rejects.toThrow('Select exactly one company');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('loads eight companies across credit windows without repeating quotes or blocking on logos', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-05T12:00:10Z'));
        const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOG', 'AMZN', 'META', 'NFLX'];
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            const url = new URL(String(input));
            if (url.pathname === '/quote')
                return response(
                    Object.fromEntries(
                        symbols.map((symbol) => [symbol, { close: '100', name: symbol }]),
                    ),
                );
            if (url.pathname === '/time_series')
                return response(
                    Object.fromEntries(
                        symbols.map((symbol) => [
                            symbol,
                            { values: [{ datetime: '2026-10-01', close: '90' }] },
                        ]),
                    ),
                );
            return response({
                url: `https://api.twelvedata.com/logo/${url.searchParams.get('symbol')}`,
            });
        });
        const params = { symbols: symbols.join(','), period: '1M' };
        await expect(stocks.execute?.('stock_market', params, context)).rejects.toBeInstanceOf(
            StockPendingError,
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
        vi.setSystemTime(new Date('2026-10-05T12:01:02Z'));
        expect(await stocks.execute?.('stock_market', params, context)).toMatchObject({
            series: symbols.map((symbol) => ({ symbol, logo: null })),
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        vi.setSystemTime(new Date('2026-10-05T12:02:02Z'));
        expect(await stocks.execute?.('stock_market', params, context)).toMatchObject({
            series: symbols.map((symbol) => ({
                symbol,
                logo: `https://api.twelvedata.com/logo/${symbol}`,
            })),
        });
        expect(fetchMock).toHaveBeenCalledTimes(10);
        await stocks.execute?.('stock_market', params, context);
        expect(fetchMock).toHaveBeenCalledTimes(10);
    });

    it('adapts the credit budget to a higher provider limit returned in response headers', async () => {
        const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOG', 'AMZN', 'META', 'NFLX'];
        let used = 0;
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            const url = new URL(String(input));
            used += (url.searchParams.get('symbol') || '').split(',').length;
            const body =
                url.pathname === '/price'
                    ? { price: '100' }
                    : url.pathname === '/quote'
                      ? Object.fromEntries(symbols.map((symbol) => [symbol, { close: '100' }]))
                      : url.pathname === '/time_series'
                        ? Object.fromEntries(
                              symbols.map((symbol) => [
                                  symbol,
                                  { values: [{ datetime: '2026-10-01', close: '90' }] },
                              ]),
                          )
                        : {
                              url: `https://api.twelvedata.com/logo/${url.searchParams.get('symbol')}`,
                          };
            return {
                ...response(body),
                headers: new Headers({
                    'api-credits-used': String(used),
                    'api-credits-left': String(55 - used),
                }),
            } as Response;
        });
        await stocks.verifyCredentials?.(context.credentials);
        const result = (await stocks.execute?.(
            'stock_market',
            { symbols: symbols.join(','), period: '1M' },
            context,
        )) as { series: unknown[] };
        expect(result.series).toHaveLength(8);
        expect(fetchMock).toHaveBeenCalledTimes(11);
    });

    it('does not repeat provider calls before retrying a quota failure', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-05T12:00:10Z'));
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(
                response({ status: 'error', code: 429, message: 'Credits used up' }),
            );
        const params = { symbols: 'AAPL', period: '1M' };
        await expect(stocks.execute?.('stock_market', params, context)).rejects.toMatchObject({
            statusCode: 429,
            retryAfter: 51,
        });
        await expect(stocks.execute?.('stock_market', params, context)).rejects.toBeInstanceOf(
            StockPendingError,
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('deduplicates concurrent widget loads by letting the follower reuse the completed cache', async () => {
        let release!: (value: Response) => void;
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        release = resolve;
                    }),
            )
            .mockResolvedValueOnce(response({ values: [{ datetime: '2026-10-01', close: '90' }] }))
            .mockResolvedValueOnce(response({ url: 'https://api.twelvedata.com/logo/apple.com' }));
        const params = { symbols: 'AAPL', period: '1M' };
        const loading = stocks.execute?.('stock_market', params, context);
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        await expect(stocks.execute?.('stock_market', params, context)).rejects.toBeInstanceOf(
            StockPendingError,
        );
        release(response({ close: '100' }));
        const result = (await loading) as { series: unknown[] };
        expect(await stocks.execute?.('stock_profile', params, context)).toMatchObject({
            series: result.series,
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('keeps available companies when another selected symbol requires a different plan', async () => {
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(
                response({
                    AAPL: { close: '100' },
                    YM38O: {
                        status: 'error',
                        code: 403,
                        message: 'YM38O is not available with your plan',
                    },
                    MSFT: { close: '200' },
                }),
            )
            .mockResolvedValueOnce(
                response({
                    AAPL: { values: [{ datetime: '2026-10-01', close: '90' }] },
                    MSFT: { values: [{ datetime: '2026-10-01', close: '190' }] },
                }),
            )
            .mockResolvedValueOnce(response({ url: 'https://api.twelvedata.com/logo/apple.com' }))
            .mockResolvedValueOnce(
                response({ url: 'https://api.twelvedata.com/logo/microsoft.com' }),
            );
        const params = { symbols: 'AAPL,YM38O,MSFT', period: '1M' };
        const result = await stocks.execute?.('stock_market', params, context);
        expect(result).toMatchObject({
            series: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }],
            unavailable: [
                { symbol: 'YM38O', message: 'Not available with the connected Twelve Data plan' },
            ],
        });
        expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('symbol')).toBe(
            'AAPL,MSFT',
        );
        expect(await stocks.execute?.('stock_market', params, context)).toEqual(result);
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('retains every successful batch item even when a quota failure is in the middle of the response', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
            response({
                AAPL: { close: '100' },
                MSFT: { status: 'error', code: 429, message: 'Credits exhausted' },
                TSLA: { close: '300' },
            }),
        );
        await expect(
            stocks.execute?.('stock_market', { symbols: 'AAPL,MSFT,TSLA', period: '1M' }, context),
        ).rejects.toBeInstanceOf(StockPendingError);
        expect(await getCache('user-1:stocks:quote:AAPL')).toMatchObject({ currentPrice: 100 });
        expect(await getCache('user-1:stocks:quote:TSLA')).toMatchObject({ currentPrice: 300 });
        expect(await getCache('user-1:stocks:unavailable:MSFT:quote')).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('caches repeated symbol searches', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            response({
                data: [
                    {
                        symbol: 'TSLA',
                        instrument_name: 'Tesla Inc',
                        instrument_type: 'Common Stock',
                        exchange: 'NASDAQ',
                    },
                ],
            }),
        );

        await stocks.search?.('tesla', context);
        await stocks.search?.('tesla', context);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('recovers ALL histories stored as legacy Map entries without new provider requests', async () => {
        const histories = [
            [
                'AAPL',
                [
                    { timestamp: Date.parse('1980-12-12'), price: 0.13 },
                    { timestamp: Date.parse('2026-10-01'), price: 250 },
                ],
            ],
            [
                'MSFT',
                [
                    { timestamp: Date.parse('1986-03-13'), price: 0.1 },
                    { timestamp: Date.parse('2026-10-01'), price: 520 },
                ],
            ],
        ] as const;
        for (const [symbol] of histories) {
            await setCache(`user-1:stocks:history:${symbol}:ALL`, histories, 60_000);
            await setCache(`user-1:stocks:logo:${symbol}`, { url: null }, 60_000);
            await setCache(`user-1:stocks:quote:${symbol}`, { currentPrice: 520 }, 60_000);
        }
        const fetchMock = vi.spyOn(globalThis, 'fetch');

        const result = await stocks.execute?.(
            'stock_market',
            { symbols: 'AAPL,MSFT', period: 'ALL' },
            context,
        );

        expect(result).toMatchObject({
            period: 'ALL',
            series: histories.map(([symbol, prices]) => ({ symbol, prices })),
        });
        expect(fetchMock).not.toHaveBeenCalled();
        for (const [symbol, prices] of histories) {
            expect(await getCache(`user-1:stocks:history:${symbol}:ALL`)).toEqual(prices);
        }
    });

    it('refetches unusable cached ALL history and keeps the full valid history in chronological order', async () => {
        await setCache(
            'user-1:stocks:history:AAPL:ALL',
            [
                { timestamp: null, price: 250 },
                { timestamp: Date.parse('2026-10-01'), price: 0 },
            ],
            60_000,
        );
        await setCache('user-1:stocks:logo:AAPL', { url: null }, 60_000);
        await setCache('user-1:stocks:quote:AAPL', { currentPrice: 250 }, 60_000);
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            response({
                values: [
                    { datetime: '2026-10-01', close: '250' },
                    { datetime: '1980-12-12', close: '0.13' },
                    { datetime: 'invalid', close: '200' },
                    { datetime: '2020-01-01', close: '0' },
                ],
            }),
        );
        const params = { symbols: 'AAPL', period: 'ALL' };

        const result = await stocks.execute?.('stock_market', params, context);
        const repeated = await stocks.execute?.('stock_market', params, context);

        expect(result).toMatchObject({
            series: [
                {
                    prices: [
                        { timestamp: Date.parse('1980-12-12'), price: 0.13 },
                        { timestamp: Date.parse('2026-10-01'), price: 250 },
                    ],
                },
            ],
        });
        expect(repeated).toEqual(result);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const url = new URL(String(fetchMock.mock.calls[0][0]));
        expect(url.pathname).toBe('/time_series');
        expect(url.searchParams.get('interval')).toBe('1week');
        expect(url.searchParams.get('start_date')).toBe('1970-01-01');
        expect(url.searchParams.has('end_date')).toBe(true);
        expect(url.searchParams.has('outputsize')).toBe(false);
    });
});
