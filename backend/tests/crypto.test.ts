import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import cryptoService from '../src/services/crypto.ts';

describe('Crypto service', () => {
    const originalFetch = global.fetch;
    const connectionOptions = {
        credentials: { apiKey: 'demo-key' },
        cacheScope: 'user-1',
        refreshRate: 60,
    };

    beforeEach(() => {
        cryptoService.clearCache();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it('verifies a CoinGecko Demo API key with a price request', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ bitcoin: { usd: 67000 } }),
        });

        await expect(
            cryptoService.verifyCredentials({ apiKey: 'demo-key' }),
        ).resolves.toBeUndefined();
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/simple/price?ids=bitcoin&vs_currencies=usd'),
            { headers: { 'x-cg-demo-api-key': 'demo-key' } },
        );
    });

    it('rejects an invalid CoinGecko API key', async () => {
        global.fetch.mockResolvedValue({ ok: false, status: 401 });

        await expect(
            cryptoService.verifyCredentials({ apiKey: 'invalid-key' }),
        ).rejects.toMatchObject({
            message: 'CoinGecko API key is invalid',
            statusCode: 400,
        });
    });

    it('requires a user connection instead of an environment key', async () => {
        await expect(cryptoService.verifyCredentials({})).rejects.toMatchObject({
            message: 'CoinGecko is not connected. Configure it in Services.',
            statusCode: 409,
        });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns current price and market statistics', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                bitcoin: {
                    eur: 62000.5,
                    eur_market_cap: 1230000000000,
                    eur_24h_vol: 28000000000,
                    eur_24h_change: 2.345,
                    last_updated_at: 1770000000,
                },
            }),
        });

        const result = await cryptoService.execute(
            'crypto_price',
            { coin: ' Bitcoin ', currency: ' EUR ' },
            connectionOptions,
        );

        expect(result).toEqual({
            type: 'crypto_price',
            coin: 'bitcoin',
            currency: 'eur',
            price: 62000.5,
            marketCap: 1230000000000,
            volume24h: 28000000000,
            change24h: 2.345,
            lastUpdatedAt: 1770000000,
        });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(
                '/simple/price?ids=bitcoin&vs_currencies=eur&include_market_cap=true',
            ),
            { headers: { 'x-cg-demo-api-key': 'demo-key' } },
        );
    });

    it('caches price data per user connection and market', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ bitcoin: { usd: 67000 } }),
        });

        const first = await cryptoService.execute(
            'crypto_price',
            { coin: 'bitcoin', currency: 'usd' },
            connectionOptions,
        );
        const second = await cryptoService.execute(
            'crypto_price',
            { coin: 'bitcoin', currency: 'usd' },
            connectionOptions,
        );

        expect(second).toEqual(first);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns a clear error for an unknown coin or currency', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}),
        });

        await expect(
            cryptoService.execute(
                'crypto_price',
                { coin: 'unknown', currency: 'eur' },
                connectionOptions,
            ),
        ).rejects.toMatchObject({
            message: 'Cryptocurrency or currency not found',
            statusCode: 404,
        });
    });

    it('returns normalized historical series for multiple cryptocurrencies', async () => {
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    prices: [
                        [1000, 60000],
                        [2000, 63000],
                    ],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    prices: [
                        [1000, 3000],
                        [2000, 2850],
                    ],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => [
                    {
                        id: 'bitcoin',
                        name: 'Bitcoin',
                        symbol: 'btc',
                        image: 'https://assets.coingecko.com/bitcoin.png',
                    },
                    {
                        id: 'ethereum',
                        name: 'Ethereum',
                        symbol: 'eth',
                        image: 'https://assets.coingecko.com/ethereum.png',
                    },
                ],
            });

        const result = await cryptoService.execute(
            'crypto_chart',
            { coins: 'bitcoin,ethereum', currency: 'eur', days: '7' },
            connectionOptions,
        );

        expect(result).toEqual({
            type: 'crypto_chart',
            currency: 'eur',
            days: 7,
            historyLimited: false,
            series: [
                {
                    coin: 'bitcoin',
                    name: 'Bitcoin',
                    symbol: 'BTC',
                    image: 'https://assets.coingecko.com/bitcoin.png',
                    currentPrice: 63000,
                    change: 5,
                    prices: [
                        { timestamp: 1000, price: 60000 },
                        { timestamp: 2000, price: 63000 },
                    ],
                },
                {
                    coin: 'ethereum',
                    name: 'Ethereum',
                    symbol: 'ETH',
                    image: 'https://assets.coingecko.com/ethereum.png',
                    currentPrice: 2850,
                    change: -5,
                    prices: [
                        { timestamp: 1000, price: 3000 },
                        { timestamp: 2000, price: 2850 },
                    ],
                },
            ],
        });
        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/coins/bitcoin/market_chart?vs_currency=eur&days=7'),
            { headers: { 'x-cg-demo-api-key': 'demo-key' } },
        );
    });

    it('supports a three-month comparison period', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                prices: [
                    [1000, 60000],
                    [2000, 63000],
                ],
            }),
        });

        const result = await cryptoService.execute(
            'crypto_chart',
            { coins: 'bitcoin', currency: 'eur', days: '90' },
            connectionOptions,
        );

        expect(result.days).toBe(90);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/coins/bitcoin/market_chart?vs_currency=eur&days=90'),
            { headers: { 'x-cg-demo-api-key': 'demo-key' } },
        );
    });

    it('allows a broad comparison while protecting the provider from excessive requests', async () => {
        await expect(
            cryptoService.execute(
                'crypto_chart',
                {
                    coins: 'bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,chainlink,polkadot',
                    currency: 'eur',
                    days: '7',
                },
                connectionOptions,
            ),
        ).rejects.toMatchObject({
            message: 'Select between 1 and 8 cryptocurrencies',
            statusCode: 400,
        });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('supports all available history for a comparison chart', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                prices: [
                    [1000, 60000],
                    [2000, 63000],
                ],
            }),
        });

        const result = await cryptoService.execute(
            'crypto_chart',
            { coins: 'bitcoin', currency: 'usd', days: 'max' },
            connectionOptions,
        );

        expect(result.days).toBe('max');
        expect(result.historyLimited).toBe(false);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/coins/bitcoin/market_chart/range?vs_currency=usd&from='),
            { headers: { 'x-cg-demo-api-key': 'demo-key' } },
        );
    });

    it('falls back to one year when the Demo plan rejects full history', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: false, status: 403 })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    prices: [
                        [1000, 60000],
                        [2000, 63000],
                    ],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => [],
            });

        const result = await cryptoService.execute(
            'crypto_chart',
            { coins: 'bitcoin', currency: 'usd', days: 'max' },
            connectionOptions,
        );

        expect(result.days).toBe('max');
        expect(result.historyLimited).toBe(true);
        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('/coins/bitcoin/market_chart?vs_currency=usd&days=365'),
            { headers: { 'x-cg-demo-api-key': 'demo-key' } },
        );
    });
});
