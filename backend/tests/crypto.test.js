describe('Crypto service', () => {
    const originalFetch = global.fetch;
    const cryptoService = require('../services/crypto');
    const connectionOptions = {
        credentials: { apiKey: 'demo-key' },
        cacheScope: 'user-1',
        refreshRate: 60,
    };

    beforeEach(() => {
        cryptoService.clearCache();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
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
});
