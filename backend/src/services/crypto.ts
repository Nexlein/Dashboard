const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const MAX_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_REFRESH_RATE_SECONDS = 60;
const MAX_CHART_COINS = 8;
const COINGECKO_HISTORY_START = 1230768000; // 2009-01-01, before the first crypto market data.
import { getCache, setCache, clearCache } from '../utils/redisCache.ts';

class CryptoServiceError extends Error {
    constructor(message, statusCode = 502) {
        super(message);
        this.statusCode = statusCode;
    }
}

function getApiKey(options) {
    const apiKey = options?.credentials?.apiKey;
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new CryptoServiceError('CoinGecko is not connected. Configure it in Services.', 409);
    }
    return apiKey.trim();
}

async function fetchCoinGecko(path, params, apiKey) {
    const query = new URLSearchParams(params);
    const url = `${COINGECKO_API_URL}${path}?${query}`;
    let response;

    try {
        response = await fetch(url, {
            headers: { 'x-cg-demo-api-key': apiKey },
        });
    } catch {
        throw new CryptoServiceError('CoinGecko provider is unavailable');
    }

    if (response.status === 401 || response.status === 403) {
        const error = new CryptoServiceError('CoinGecko API key is invalid', 400);
        error.providerStatus = response.status;
        throw error;
    }
    if (response.status === 429) {
        throw new CryptoServiceError('CoinGecko API rate limit reached', 503);
    }
    if (!response.ok) {
        const error = new CryptoServiceError('CoinGecko provider request failed');
        error.providerStatus = response.status;
        throw error;
    }

    return response.json();
}

async function verifyCredentials(credentials) {
    const apiKey = getApiKey({ credentials });
    const payload = await fetchCoinGecko(
        '/simple/price',
        { ids: 'bitcoin', vs_currencies: 'usd' },
        apiKey,
    );

    if (typeof payload?.bitcoin?.usd !== 'number') {
        throw new CryptoServiceError('CoinGecko API key could not be verified', 400);
    }
}

function normalizedParam(value, field, maxLength) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!normalized || normalized.length > maxLength || !/^[a-z0-9-]+$/.test(normalized)) {
        throw new CryptoServiceError(`${field} is invalid`, 400);
    }
    return normalized;
}

function normalizedCoins(value) {
    const rawCoins = Array.isArray(value)
        ? value
        : typeof value === 'string'
          ? value.split(',')
          : [];
    const coins = [...new Set(rawCoins.map((coin) => normalizedParam(coin, 'Coin', 100)))];

    if (!coins.length || coins.length > MAX_CHART_COINS) {
        throw new CryptoServiceError(
            `Select between 1 and ${MAX_CHART_COINS} cryptocurrencies`,
            400,
        );
    }
    return coins;
}

async function fetchChartHistory(coin, currency, days, apiKey) {
    if (days !== 'max') {
        return {
            payload: await fetchCoinGecko(
                `/coins/${coin}/market_chart`,
                { vs_currency: currency, days: String(days), precision: 'full' },
                apiKey,
            ),
            historyLimited: false,
        };
    }

    try {
        return {
            payload: await fetchCoinGecko(
                `/coins/${coin}/market_chart/range`,
                {
                    vs_currency: currency,
                    from: String(COINGECKO_HISTORY_START),
                    to: String(Math.floor(Date.now() / 1000)),
                    precision: 'full',
                },
                apiKey,
            ),
            historyLimited: false,
        };
    } catch (error) {
        // Demo plans can restrict full-range history. In that case, show the
        // deepest commonly available history rather than breaking the widget.
        if (![400, 401, 403, 404, 422].includes(error.providerStatus)) throw error;
        return {
            payload: await fetchCoinGecko(
                `/coins/${coin}/market_chart`,
                { vs_currency: currency, days: '365', precision: 'full' },
                apiKey,
            ),
            historyLimited: true,
        };
    }
}

async function fetchCoinMetadata(coins, currency, apiKey) {
    try {
        const payload = await fetchCoinGecko(
            '/coins/markets',
            {
                vs_currency: currency,
                ids: coins.join(','),
                sparkline: 'false',
            },
            apiKey,
        );

        if (!Array.isArray(payload)) return new Map();
        return new Map(
            payload.map((coin) => {
                let image = null;
                try {
                    const imageUrl = new URL(coin.image);
                    if (imageUrl.protocol === 'https:') image = imageUrl.toString();
                } catch {
                    // A missing logo should never prevent the chart from rendering.
                }
                return [
                    coin.id,
                    {
                        name: typeof coin.name === 'string' ? coin.name : coin.id,
                        symbol:
                            typeof coin.symbol === 'string'
                                ? coin.symbol.toUpperCase()
                                : coin.id.slice(0, 4).toUpperCase(),
                        image,
                    },
                ];
            }),
        );
    } catch {
        return new Map();
    }
}

function normalizedDays(value) {
    if (value === 'max') return 'max';

    const days = Number(value);
    if (![1, 7, 30, 90, 365].includes(days)) {
        throw new CryptoServiceError('Chart period is invalid', 400);
    }
    return days;
}

function cacheTtl(options) {
    const requestedRefreshRate = Number(options.refreshRate);
    const refreshRate = Number.isFinite(requestedRefreshRate)
        ? Math.max(requestedRefreshRate, MIN_REFRESH_RATE_SECONDS)
        : MIN_REFRESH_RATE_SECONDS;
    return Math.min(refreshRate * 1000, MAX_CACHE_TTL_MS);
}

async function execute(widgetName, params = {}, options = {}) {
    if (!['crypto_price', 'crypto_chart'].includes(widgetName)) {
        throw new CryptoServiceError('Unsupported crypto widget', 400);
    }

    const currency = normalizedParam(params.currency, 'Currency', 20);
    const apiKey = getApiKey(options);
    const cacheScope = options.cacheScope || 'unscoped';
    const cacheTtlMs = cacheTtl(options);

    if (widgetName === 'crypto_chart') {
        const coins = normalizedCoins(params.coins);
        const days = normalizedDays(params.days);
        const cacheKey = `${cacheScope}:${widgetName}:${coins.join(',')}:${currency}:${days}`;
        const cached = await getCache(cacheKey);

        if (cached) return cached;

        const chartResults = await Promise.all(
            coins.map(async (coin) => {
                const { payload, historyLimited } = await fetchChartHistory(
                    coin,
                    currency,
                    days,
                    apiKey,
                );
                const prices = (payload?.prices || [])
                    .filter(
                        (point) =>
                            Array.isArray(point) &&
                            Number.isFinite(point[0]) &&
                            Number.isFinite(point[1]),
                    )
                    .map(([timestamp, price]) => ({ timestamp, price }));

                if (!prices.length) {
                    throw new CryptoServiceError(`No chart data found for ${coin}`, 404);
                }

                const firstPrice = prices[0].price;
                const currentPrice = prices[prices.length - 1].price;
                const change = firstPrice ? ((currentPrice - firstPrice) / firstPrice) * 100 : null;

                return { series: { coin, currentPrice, change, prices }, historyLimited };
            }),
        );
        const series = chartResults.map((result) => result.series);
        const historyLimited = chartResults.some((result) => result.historyLimited);
        const metadata = await fetchCoinMetadata(coins, currency, apiKey);
        const enrichedSeries = series.map((item) => ({
            ...item,
            ...(metadata.get(item.coin) || {}),
        }));
        const data = {
            type: 'crypto_chart',
            currency,
            days,
            historyLimited,
            series: enrichedSeries,
        };

        await setCache(cacheKey, data, cacheTtlMs);
        return data;
    }

    const coin = normalizedParam(params.coin, 'Coin', 100);
    const cacheKey = `${cacheScope}:${widgetName}:${coin}:${currency}`;
    const cached = await getCache(cacheKey);

    if (cached) return cached;

    const payload = await fetchCoinGecko(
        '/simple/price',
        {
            ids: coin,
            vs_currencies: currency,
            include_market_cap: 'true',
            include_24hr_vol: 'true',
            include_24hr_change: 'true',
            include_last_updated_at: 'true',
        },
        apiKey,
    );
    const market = payload?.[coin];

    if (!market || typeof market[currency] !== 'number') {
        throw new CryptoServiceError('Cryptocurrency or currency not found', 404);
    }

    const data = {
        type: 'crypto_price',
        coin,
        currency,
        price: market[currency],
        marketCap: market[`${currency}_market_cap`] ?? null,
        volume24h: market[`${currency}_24h_vol`] ?? null,
        change24h: market[`${currency}_24h_change`] ?? null,
        lastUpdatedAt: market.last_updated_at ?? null,
    };

    await setCache(cacheKey, data, cacheTtlMs);
    return data;
}

export default {
    name: 'crypto',
    displayName: 'CoinGecko',
    description: 'Cryptocurrency prices and market history',
    connection: {
        type: 'apiKey',
        label: 'CoinGecko Demo API key',
        documentationUrl: 'https://www.coingecko.com/en/developers/dashboard',
    },
    widgets: [
        {
            name: 'crypto_price',
            description: 'Displays the current price and 24-hour change of a cryptocurrency',
            params: [
                { name: 'coin', type: 'string' },
                { name: 'currency', type: 'string' },
            ],
        },
        {
            name: 'crypto_chart',
            description: 'Compares historical price performance for multiple cryptocurrencies',
            params: [
                { name: 'coins', type: 'string' },
                { name: 'currency', type: 'string' },
                { name: 'days', type: 'integer' },
            ],
        },
    ],
    execute,
    verifyCredentials,
    CryptoServiceError,
    clearCache,
};
