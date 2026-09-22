const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const MAX_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_REFRESH_RATE_SECONDS = 60;
const cache = new Map();

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
        throw new CryptoServiceError('CoinGecko API key is invalid', 400);
    }
    if (response.status === 429) {
        throw new CryptoServiceError('CoinGecko API rate limit reached', 503);
    }
    if (!response.ok) {
        throw new CryptoServiceError('CoinGecko provider request failed');
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

async function execute(widgetName, params = {}, options = {}) {
    if (widgetName !== 'crypto_price') {
        throw new CryptoServiceError('Unsupported crypto widget', 400);
    }

    const coin = normalizedParam(params.coin, 'Coin', 100);
    const currency = normalizedParam(params.currency, 'Currency', 20);
    const apiKey = getApiKey(options);
    const cacheScope = options.cacheScope || 'unscoped';
    const cacheKey = `${cacheScope}:${widgetName}:${coin}:${currency}`;
    const requestedRefreshRate = Number(options.refreshRate);
    const refreshRate = Number.isFinite(requestedRefreshRate)
        ? Math.max(requestedRefreshRate, MIN_REFRESH_RATE_SECONDS)
        : MIN_REFRESH_RATE_SECONDS;
    const cacheTtlMs = Math.min(refreshRate * 1000, MAX_CACHE_TTL_MS);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt < cacheTtlMs) return cached.data;

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

    cache.set(cacheKey, { data, fetchedAt: Date.now() });
    return data;
}

module.exports = {
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
    ],
    execute,
    verifyCredentials,
    CryptoServiceError,
    clearCache: () => cache.clear(),
};
