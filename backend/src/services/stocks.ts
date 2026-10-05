// @ts-nocheck
const TWELVE_DATA_API_URL = 'https://api.twelvedata.com';
const MAX_STOCKS = 8;
const MIN_REFRESH_RATE_SECONDS = 60;
const MAX_QUOTE_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
import {
    StockPendingError,
    withStockProvider,
    reserveStockCredits,
    recordStockCredits,
    stockRateLimit,
} from './stockProvider.ts';
import type { ServiceDefinition } from './types.ts';
// -nocheck
import { getCache, setCache, clearCache } from '../utils/redisCache.ts';

const PERIODS = {
    '1W': { days: 7, interval: '1h', historyTtlMs: 5 * 60 * 1000 },
    '1M': { days: 30, interval: '1day', historyTtlMs: 15 * 60 * 1000 },
    '1Y': { days: 365, interval: '1day', historyTtlMs: 60 * 60 * 1000 },
    '5Y': { years: 5, interval: '1day', historyTtlMs: 60 * 60 * 1000 },
    ALL: {
        startDate: '1970-01-01',
        interval: '1week',
        historyTtlMs: 24 * 60 * 60 * 1000,
    },
};

class StockServiceError extends Error {
    constructor(message, statusCode = 502) {
        super(message);
        this.statusCode = statusCode;
    }
}

function getApiKey(options) {
    const apiKey = options?.credentials?.apiKey;
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new StockServiceError('Twelve Data is not connected. Configure it in Services.', 409);
    }
    return apiKey.trim();
}

async function fetchTwelveData(path, params, apiKey) {
    const query = new URLSearchParams(params);
    const url = `${TWELVE_DATA_API_URL}${path}?${query}`;
    await reserveStockCredits(apiKey, params.symbol ? params.symbol.split(',').length : 1);
    let response;

    try {
        response = await fetch(url, {
            headers: { Authorization: `apikey ${apiKey}` },
            signal: AbortSignal.timeout(path === '/logo' ? 5000 : 10_000),
        });
    } catch {
        throw new StockServiceError('Twelve Data provider is unavailable');
    }

    await recordStockCredits(apiKey, response);
    if (response.status === 401 || response.status === 403) {
        const error = new StockServiceError('Twelve Data API key is invalid or lacks access', 400);
        error.providerStatus = response.status;
        throw error;
    }
    if (response.status === 429) {
        await stockRateLimit(apiKey, '', response.headers?.get('retry-after'));
    }
    if (!response.ok) {
        const error = new StockServiceError('Twelve Data request failed');
        error.providerStatus = response.status;
        throw error;
    }

    const payload = await response.json();
    if (payload?.status === 'error') {
        const message = String(payload.message || '').toLowerCase();
        const isRateLimit =
            payload.code === 429 || message.includes('credit') || message.includes('limit');
        if (isRateLimit)
            await stockRateLimit(
                apiKey,
                String(payload.message || ''),
                response.headers?.get('retry-after'),
            );
        const error = new StockServiceError(
            isRateLimit
                ? 'Twelve Data API rate limit reached'
                : payload.message || 'Twelve Data request failed',
            isRateLimit ? 503 : 400,
        );
        error.providerStatus = payload.code;
        throw error;
    }
    return payload;
}

async function verifyCredentials(credentials) {
    const apiKey = getApiKey({ credentials });
    const payload = await withStockProvider(apiKey, () =>
        fetchTwelveData('/price', { symbol: 'AAPL' }, apiKey),
    );
    if (!Number.isFinite(Number(payload?.price))) {
        throw new StockServiceError('Twelve Data API key could not be verified', 400);
    }
}

function normalizedSymbols(value) {
    const rawSymbols = Array.isArray(value)
        ? value
        : typeof value === 'string'
          ? value.split(',')
          : [];
    const symbols = [
        ...new Set(
            rawSymbols
                .map((symbol) => (typeof symbol === 'string' ? symbol.trim().toUpperCase() : ''))
                .filter(Boolean),
        ),
    ];

    if (
        !symbols.length ||
        symbols.length > MAX_STOCKS ||
        symbols.some((symbol) => symbol.length > 24 || !/^[A-Z0-9.^/-]+$/.test(symbol))
    ) {
        throw new StockServiceError(`Select between 1 and ${MAX_STOCKS} valid stock symbols`, 400);
    }
    return symbols;
}

function normalizedPeriod(value) {
    const period = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (!Object.hasOwn(PERIODS, period)) {
        throw new StockServiceError('Stock chart period is invalid', 400);
    }
    return period;
}

function batchItem(payload, symbol, symbolCount) {
    if (symbolCount === 1 && (payload?.values || payload?.close)) return payload;
    return payload?.[symbol] || payload?.[symbol.toLowerCase()] || null;
}

function parseTimestamp(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.includes(' ') ? `${value.replace(' ', 'T')}Z` : value;
    const timestamp = Date.parse(normalized);
    return Number.isFinite(timestamp) ? timestamp : null;
}

function dateOnly(date) {
    return date.toISOString().slice(0, 10);
}

function cachedHistoryPrices(cached, symbol) {
    if (!Array.isArray(cached)) return null;
    // Earlier versions cached serialized Map entries, even for a single symbol.
    const prices = Array.isArray(cached[0])
        ? cached.find((entry) => Array.isArray(entry) && entry[0] === symbol)?.[1]
        : cached;
    if (!Array.isArray(prices)) return null;
    const validPrices = prices
        .filter(
            (point) =>
                Number.isFinite(point?.timestamp) &&
                Number.isFinite(point?.price) &&
                point.price > 0,
        )
        .sort((left, right) => left.timestamp - right.timestamp);
    return validPrices.length ? validPrices : null;
}

function unavailableKey(cacheScope, symbol, period) {
    return `${cacheScope}:stocks:unavailable:${symbol}:${period || 'quote'}`;
}

async function unavailableSymbol(cacheScope, symbol, period, message) {
    const reason = /plan|subscription|premium/i.test(message || '')
        ? 'Not available with the connected Twelve Data plan'
        : String(message || 'No market data available').replace(/\*\*/g, '');
    await setCache(
        unavailableKey(cacheScope, symbol, period),
        { symbol, message: reason },
        15 * 60 * 1000,
    );
}

async function getQuotes(symbols, apiKey, cacheScope, refreshRate) {
    const quotes = new Map();
    const missingSymbols = [];
    for (const symbol of symbols) {
        const cached = await getCache(`${cacheScope}:stocks:quote:${symbol}`);
        if (cached) quotes.set(symbol, cached);
        else if (!(await getCache(unavailableKey(cacheScope, symbol)))) missingSymbols.push(symbol);
    }
    if (!missingSymbols.length) return quotes;

    const payload = await fetchTwelveData('/quote', { symbol: missingSymbols.join(',') }, apiKey);
    const requestedTtl = Math.max(Number(refreshRate) || 0, MIN_REFRESH_RATE_SECONDS) * 1000;
    // Keep scarce credits available for new chart periods rather than repeated quotes.
    const ttl = Math.max(requestedTtl, MAX_QUOTE_CACHE_TTL_MS);
    let retryError = null;
    for (const symbol of missingSymbols) {
        const quote = batchItem(payload, symbol, missingSymbols.length);
        if (quote?.status === 'error') {
            if (quote.code === 429 || /credit|limit/i.test(quote.message || '')) {
                try {
                    await stockRateLimit(apiKey, quote.message || '');
                } catch (error) {
                    retryError = error;
                }
                continue;
            }
            await unavailableSymbol(cacheScope, symbol, null, quote.message);
            continue;
        }
        const price = Number(quote?.close ?? quote?.price);
        if (!quote || !Number.isFinite(price)) {
            await unavailableSymbol(cacheScope, symbol, null, `Stock symbol not found: ${symbol}`);
            continue;
        }
        const normalizedQuote = {
            name: typeof quote.name === 'string' ? quote.name : symbol,
            currency: typeof quote.currency === 'string' ? quote.currency : 'USD',
            exchange: typeof quote.exchange === 'string' ? quote.exchange : null,
            currentPrice: price,
            change: Number.isFinite(Number(quote.percent_change))
                ? Number(quote.percent_change)
                : null,
        };
        quotes.set(symbol, normalizedQuote);
        await setCache(`${cacheScope}:stocks:quote:${symbol}`, normalizedQuote, ttl);
    }
    if (retryError) throw retryError;
    return quotes;
}

async function getHistory(symbols, period, apiKey, cacheScope) {
    const config = PERIODS[period];
    const histories = new Map();
    const missingSymbols = [];
    for (const symbol of symbols) {
        const cacheKey = `${cacheScope}:stocks:history:${symbol}:${period}`;
        const cached = await getCache(cacheKey);
        const prices = cachedHistoryPrices(cached, symbol);
        if (prices) {
            histories.set(symbol, prices);
            if (Array.isArray(cached[0])) {
                await setCache(cacheKey, prices, config.historyTtlMs);
            }
        } else if (!(await getCache(unavailableKey(cacheScope, symbol, period))))
            missingSymbols.push(symbol);
    }
    if (!missingSymbols.length) return histories;

    const endDate = new Date();
    const startDate = new Date(endDate);
    if (config.years) startDate.setUTCFullYear(endDate.getUTCFullYear() - config.years);
    else if (config.days) startDate.setUTCDate(endDate.getUTCDate() - config.days);
    const payload = await fetchTwelveData(
        '/time_series',
        {
            symbol: missingSymbols.join(','),
            interval: config.interval,
            start_date: config.startDate || dateOnly(startDate),
            end_date: dateOnly(endDate),
            timezone: 'UTC',
            order: 'ASC',
        },
        apiKey,
    );

    let retryError = null;
    for (const symbol of missingSymbols) {
        const item = batchItem(payload, symbol, missingSymbols.length);
        if (item?.status === 'error') {
            if (item.code === 429 || /credit|limit/i.test(item.message || '')) {
                try {
                    await stockRateLimit(apiKey, item.message || '');
                } catch (error) {
                    retryError = error;
                }
                continue;
            }
            await unavailableSymbol(cacheScope, symbol, period, item.message);
            continue;
        }
        const prices = (item?.values || [])
            .map((point) => ({
                timestamp: parseTimestamp(point.datetime),
                price: Number(point.close),
            }))
            .filter(
                (point) =>
                    point.timestamp !== null && Number.isFinite(point.price) && point.price > 0,
            )
            .sort((left, right) => left.timestamp - right.timestamp);
        if (!prices.length) {
            await unavailableSymbol(
                cacheScope,
                symbol,
                period,
                `No market data found for ${symbol}`,
            );
            continue;
        }
        histories.set(symbol, prices);
        await setCache(
            `${cacheScope}:stocks:history:${symbol}:${period}`,
            prices,
            config.historyTtlMs,
        );
    }
    if (retryError) throw retryError;
    return histories;
}

async function searchUnlocked(query, options = {}) {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    if (normalizedQuery.length < 1 || normalizedQuery.length > 80) {
        throw new StockServiceError('Enter a stock name or symbol', 400);
    }
    const apiKey = getApiKey(options);
    const cacheKey = `${options.cacheScope || 'unscoped'}:stocks:search:${normalizedQuery.toLowerCase()}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const payload = await fetchTwelveData(
        '/symbol_search',
        { symbol: normalizedQuery, outputsize: '8' },
        apiKey,
    );
    const results = (payload?.data || [])
        .filter((item) => item?.instrument_type === 'Common Stock' || item?.type === 'Common Stock')
        .slice(0, 8)
        .map((item) => ({
            symbol: String(item.symbol || '').toUpperCase(),
            name: item.instrument_name || item.name || item.symbol,
            exchange: item.exchange || null,
            country: item.country || null,
        }))
        .filter((item) => item.symbol);
    await setCache(cacheKey, results, SEARCH_CACHE_TTL_MS);
    return results;
}

// Logos are requested only for selected companies, with a long cache and a
// short negative cache. A missing logo must never hide prices or the chart.
async function getLogo(symbol, apiKey, cacheScope) {
    const key = `${cacheScope}:stocks:logo:${symbol}`;
    const cached = await getCache(key);
    if (cached) return cached.url;
    let url = null;
    try {
        const payload = await fetchTwelveData('/logo', { symbol }, apiKey);
        const candidate = new URL(payload.url);
        if (
            candidate.protocol === 'https:' &&
            !candidate.username &&
            !candidate.password &&
            !candidate.search &&
            !candidate.hash
        )
            url = candidate.href;
    } catch (error) {
        if (error instanceof StockPendingError) return null;
        // Provider plan restrictions or missing branding leave the initials visible.
    }
    await setCache(key, { url }, url ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000);
    return url;
}

function validateParams(widgetName, params = {}) {
    if (!['stock_market', 'stock_profile'].includes(widgetName)) {
        throw new StockServiceError('Unsupported stock widget', 400);
    }
    const symbols = normalizedSymbols(params.symbols);
    if (widgetName === 'stock_profile' && symbols.length !== 1) {
        throw new StockServiceError('Select exactly one company for a stock profile', 400);
    }
    normalizedPeriod(params.period);
}

async function search(query, options = {}) {
    return withStockProvider(getApiKey(options), () => searchUnlocked(query, options));
}

async function execute(widgetName, params = {}, options = {}) {
    validateParams(widgetName, params);
    return withStockProvider(getApiKey(options), () =>
        executeUnlocked(widgetName, params, options),
    );
}

async function executeUnlocked(widgetName, params = {}, options = {}) {
    const symbols = normalizedSymbols(params.symbols);
    const period = normalizedPeriod(params.period);
    const apiKey = getApiKey(options);
    const cacheScope = options.cacheScope || 'unscoped';

    // Sequential calls respect the provider budget and preserve a successful first batch.
    const quotes = await getQuotes(symbols, apiKey, cacheScope, options.refreshRate);
    const histories = await getHistory([...quotes.keys()], period, apiKey, cacheScope);
    const available = symbols.filter((symbol) => quotes.has(symbol) && histories.has(symbol));
    const unavailable = [];
    for (const symbol of symbols.filter((symbol) => !available.includes(symbol))) {
        unavailable.push(
            (await getCache(unavailableKey(cacheScope, symbol))) ||
                (await getCache(unavailableKey(cacheScope, symbol, period))) || {
                    symbol,
                    message: 'No market data available',
                },
        );
    }
    if (!available.length)
        throw new StockServiceError(
            unavailable.map((item) => `${item.symbol}: ${item.message}`).join('; '),
            404,
        );

    const logos = new Map();
    for (const symbol of available) logos.set(symbol, await getLogo(symbol, apiKey, cacheScope));

    return {
        type: widgetName,
        period,
        ...(unavailable.length && { unavailable }),
        series: available.map((symbol) => ({
            symbol,
            ...quotes.get(symbol),
            logo: logos.get(symbol),
            prices: histories.get(symbol),
        })),
    };
}

const stocks = {
    name: 'stocks',
    displayName: 'Twelve Data',
    description: 'Stock prices and historical market data',
    connection: {
        type: 'apiKey',
        label: 'Twelve Data API key',
        documentationUrl: 'https://twelvedata.com/account/api-keys',
    },
    widgets: [
        {
            name: 'stock_market',
            description: 'Compares current and historical prices for listed companies',
            params: [
                { name: 'symbols', type: 'string' },
                { name: 'period', type: 'string' },
            ],
        },
        {
            name: 'stock_profile',
            description: 'A single company price, daily change and historical price chart',
            params: [
                { name: 'symbols', type: 'string' },
                { name: 'period', type: 'string' },
            ],
        },
    ],
    execute,
    validateParams,
    search,
    verifyCredentials,
    clearCache,
};

export { StockServiceError };
export default stocks as ServiceDefinition;
