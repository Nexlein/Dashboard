import type { ApiErrorCode } from 'shared';
import {
    StockPendingError,
    withStockProvider,
    reserveStockCredits,
    recordStockCredits,
    stockRateLimit,
} from './stockProvider.ts';
import { getCache, setCache, clearCache } from '../utils/redisCache.ts';
import { HttpError } from '../utils/httpError.ts';
import type {
    ServiceContext,
    ServiceCredentials,
    ServiceDefinition,
    WidgetParams,
} from './types.ts';

const TWELVE_DATA_API_URL = 'https://api.twelvedata.com';
const MAX_STOCKS = 8;
const MIN_REFRESH_RATE_SECONDS = 60;
// Quotes stay cached at least this long whatever the refresh rate: a free key has 8 credits
// a minute, which eight quotes use up, so shorter caches would leave none for the charts.
const MIN_QUOTE_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;

type Period = '1W' | '1M' | '1Y' | '5Y' | 'ALL';
type PeriodConfig = {
    interval: string;
    historyTtlMs: number;
    days?: number;
    years?: number;
    startDate?: string;
};

const PERIODS: Record<Period, PeriodConfig> = {
    '1W': { days: 7, interval: '1h', historyTtlMs: 5 * 60 * 1000 },
    '1M': { days: 30, interval: '1day', historyTtlMs: 15 * 60 * 1000 },
    '1Y': { days: 365, interval: '1day', historyTtlMs: 60 * 60 * 1000 },
    '5Y': { years: 5, interval: '1day', historyTtlMs: 60 * 60 * 1000 },
    ALL: { startDate: '1970-01-01', interval: '1week', historyTtlMs: 24 * 60 * 60 * 1000 },
};

// The parts of the Twelve Data responses this service reads.
type ProviderError = { status?: string; code?: number; message?: string };
type QuotePayload = ProviderError & {
    name?: unknown;
    currency?: unknown;
    exchange?: unknown;
    close?: unknown;
    price?: unknown;
    percent_change?: unknown;
};
type TimeSeriesPayload = ProviderError & {
    values?: { datetime?: unknown; close?: unknown }[];
};
type SearchPayload = {
    data?: {
        symbol?: string;
        instrument_name?: string;
        name?: string;
        exchange?: string;
        country?: string;
        instrument_type?: string;
        type?: string;
    }[];
};
/** A batch answer is keyed by symbol; a single-symbol answer is the item itself. */
type BatchPayload<T> = T & Record<string, T | undefined>;

type Quote = {
    name: string;
    currency: string;
    exchange: string | null;
    currentPrice: number;
    change: number | null;
};
type PricePoint = { timestamp: number; price: number };
type Unavailable = { symbol: string; message: string };
export type StockSearchResult = {
    symbol: string;
    name: string;
    exchange: string | null;
    country: string | null;
};

class StockServiceError extends HttpError {
    /** Status returned by Twelve Data, when the error comes from its answer. */
    providerStatus?: number;

    constructor(message: string, statusCode: number, code: ApiErrorCode) {
        super(message, statusCode, code);
    }
}

function getApiKey(options: Pick<ServiceContext, 'credentials'>): string {
    const apiKey = options?.credentials?.apiKey;
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new StockServiceError(
            'Twelve Data is not connected. Configure it in Services.',
            409,
            'TWELVE_DATA_NOT_CONNECTED',
        );
    }
    return apiKey.trim();
}

const isRateLimitError = (item: ProviderError) =>
    item.code === 429 || /credit|limit/i.test(item.message || '');

async function fetchTwelveData<T>(
    path: string,
    params: Record<string, string>,
    apiKey: string,
): Promise<T> {
    const query = new URLSearchParams(params);
    const url = `${TWELVE_DATA_API_URL}${path}?${query}`;
    await reserveStockCredits(apiKey, params.symbol ? params.symbol.split(',').length : 1);
    let response: Response;

    try {
        response = await fetch(url, {
            headers: { Authorization: `apikey ${apiKey}` },
            signal: AbortSignal.timeout(path === '/logo' ? 5000 : 10_000),
        });
    } catch {
        throw new StockServiceError(
            'Twelve Data provider is unavailable',
            502,
            'TWELVE_DATA_UNAVAILABLE',
        );
    }

    await recordStockCredits(apiKey, response);
    if (response.status === 401 || response.status === 403) {
        const error = new StockServiceError(
            'Twelve Data API key is invalid or lacks access',
            400,
            'TWELVE_DATA_KEY_INVALID',
        );
        error.providerStatus = response.status;
        throw error;
    }
    if (response.status === 429) {
        await stockRateLimit(apiKey, '', response.headers?.get('retry-after'));
    }
    if (!response.ok) {
        const error = new StockServiceError(
            'Twelve Data request failed',
            502,
            'TWELVE_DATA_REQUEST_FAILED',
        );
        error.providerStatus = response.status;
        throw error;
    }

    const payload = (await response.json()) as T & ProviderError;
    if (payload?.status === 'error') {
        const rateLimited = isRateLimitError(payload);
        if (rateLimited)
            await stockRateLimit(
                apiKey,
                String(payload.message || ''),
                response.headers?.get('retry-after'),
            );
        const error = new StockServiceError(
            rateLimited
                ? 'Twelve Data API rate limit reached'
                : payload.message || 'Twelve Data request failed',
            rateLimited ? 503 : 400,
            rateLimited ? 'TWELVE_DATA_RATE_LIMIT' : 'TWELVE_DATA_REQUEST_FAILED',
        );
        error.providerStatus = payload.code;
        throw error;
    }
    return payload;
}

async function verifyCredentials(credentials: ServiceCredentials) {
    const apiKey = getApiKey({ credentials });
    const payload = await withStockProvider(apiKey, () =>
        fetchTwelveData<{ price?: unknown }>('/price', { symbol: 'AAPL' }, apiKey),
    );
    if (!Number.isFinite(Number(payload?.price))) {
        throw new StockServiceError(
            'Twelve Data API key could not be verified',
            400,
            'TWELVE_DATA_KEY_UNVERIFIED',
        );
    }
}

function normalizedSymbols(value: unknown): string[] {
    const rawSymbols: unknown[] = Array.isArray(value)
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
        throw new StockServiceError(
            `Select between 1 and ${MAX_STOCKS} valid stock symbols`,
            400,
            'STOCK_SYMBOLS_INVALID',
        );
    }
    return symbols;
}

function normalizedPeriod(value: unknown): Period {
    const period = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (!Object.hasOwn(PERIODS, period)) {
        throw new StockServiceError('Stock chart period is invalid', 400, 'STOCK_PERIOD_INVALID');
    }
    return period as Period;
}

function batchItem<T extends object>(
    payload: BatchPayload<T>,
    symbol: string,
    symbolCount: number,
    isItem: (payload: T) => boolean,
): T | null {
    if (symbolCount === 1 && isItem(payload)) return payload;
    return payload?.[symbol] || payload?.[symbol.toLowerCase()] || null;
}

function parseTimestamp(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const normalized = value.includes(' ') ? `${value.replace(' ', 'T')}Z` : value;
    const timestamp = Date.parse(normalized);
    return Number.isFinite(timestamp) ? timestamp : null;
}

function dateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function cachedHistoryPrices(cached: unknown, symbol: string): PricePoint[] | null {
    if (!Array.isArray(cached)) return null;
    // Earlier versions cached serialized Map entries, even for a single symbol.
    const prices: unknown = Array.isArray(cached[0])
        ? (cached as unknown[][]).find((entry) => entry[0] === symbol)?.[1]
        : cached;
    if (!Array.isArray(prices)) return null;
    const validPrices = (prices as Partial<PricePoint>[])
        .filter(
            (point): point is PricePoint =>
                Number.isFinite(point?.timestamp) &&
                Number.isFinite(point?.price) &&
                point.price! > 0,
        )
        .sort((left, right) => left.timestamp - right.timestamp);
    return validPrices.length ? validPrices : null;
}

function unavailableKey(cacheScope: string, symbol: string, period?: Period | null): string {
    return `${cacheScope}:stocks:unavailable:${symbol}:${period || 'quote'}`;
}

async function unavailableSymbol(
    cacheScope: string,
    symbol: string,
    period: Period | null,
    message?: string,
) {
    const reason = /plan|subscription|premium/i.test(message || '')
        ? 'Not available with the connected Twelve Data plan'
        : String(message || 'No market data available').replace(/\*\*/g, '');
    await setCache(
        unavailableKey(cacheScope, symbol, period),
        { symbol, message: reason } satisfies Unavailable,
        15 * 60 * 1000,
    );
}

/** Records the error a batch item carries; returns the rate-limit error to rethrow, if any. */
async function handleItemError(
    item: ProviderError,
    apiKey: string,
    cacheScope: string,
    symbol: string,
    period: Period | null,
): Promise<unknown> {
    if (!isRateLimitError(item)) {
        await unavailableSymbol(cacheScope, symbol, period, item.message);
        return null;
    }
    try {
        await stockRateLimit(apiKey, item.message || '');
    } catch (error) {
        return error;
    }
    return null;
}

async function getQuotes(
    symbols: string[],
    apiKey: string,
    cacheScope: string,
    refreshRate?: number,
): Promise<Map<string, Quote>> {
    const quotes = new Map<string, Quote>();
    const missingSymbols: string[] = [];
    for (const symbol of symbols) {
        const cached = await getCache<Quote>(`${cacheScope}:stocks:quote:${symbol}`);
        if (cached) quotes.set(symbol, cached);
        else if (!(await getCache(unavailableKey(cacheScope, symbol)))) missingSymbols.push(symbol);
    }
    if (!missingSymbols.length) return quotes;

    const payload = await fetchTwelveData<BatchPayload<QuotePayload>>(
        '/quote',
        { symbol: missingSymbols.join(',') },
        apiKey,
    );
    const requestedTtl = Math.max(Number(refreshRate) || 0, MIN_REFRESH_RATE_SECONDS) * 1000;
    const ttl = Math.max(requestedTtl, MIN_QUOTE_CACHE_TTL_MS);
    let retryError: unknown = null;
    for (const symbol of missingSymbols) {
        const quote = batchItem(
            payload,
            symbol,
            missingSymbols.length,
            (item) => item.close !== undefined || item.price !== undefined,
        );
        if (quote?.status === 'error') {
            retryError =
                (await handleItemError(quote, apiKey, cacheScope, symbol, null)) || retryError;
            continue;
        }
        const price = Number(quote?.close ?? quote?.price);
        if (!quote || !Number.isFinite(price)) {
            await unavailableSymbol(cacheScope, symbol, null, `Stock symbol not found: ${symbol}`);
            continue;
        }
        const normalizedQuote: Quote = {
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

async function getHistory(
    symbols: string[],
    period: Period,
    apiKey: string,
    cacheScope: string,
): Promise<Map<string, PricePoint[]>> {
    const config = PERIODS[period];
    const histories = new Map<string, PricePoint[]>();
    const missingSymbols: string[] = [];
    for (const symbol of symbols) {
        const cacheKey = `${cacheScope}:stocks:history:${symbol}:${period}`;
        const cached = await getCache<unknown[]>(cacheKey);
        const prices = cachedHistoryPrices(cached, symbol);
        if (prices) {
            histories.set(symbol, prices);
            if (Array.isArray(cached?.[0])) {
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
    const payload = await fetchTwelveData<BatchPayload<TimeSeriesPayload>>(
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

    let retryError: unknown = null;
    for (const symbol of missingSymbols) {
        const item = batchItem(payload, symbol, missingSymbols.length, (series) =>
            Array.isArray(series.values),
        );
        if (item?.status === 'error') {
            retryError =
                (await handleItemError(item, apiKey, cacheScope, symbol, period)) || retryError;
            continue;
        }
        const prices = (item?.values || [])
            .map((point) => ({
                timestamp: parseTimestamp(point.datetime),
                price: Number(point.close),
            }))
            .filter(
                (point): point is PricePoint =>
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

async function searchUnlocked(
    query: string,
    options: ServiceContext,
): Promise<StockSearchResult[]> {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    if (normalizedQuery.length < 1 || normalizedQuery.length > 80) {
        throw new StockServiceError('Enter a stock name or symbol', 400, 'STOCK_SEARCH_REQUIRED');
    }
    const apiKey = getApiKey(options);
    const cacheKey = `${options.cacheScope || 'unscoped'}:stocks:search:${normalizedQuery.toLowerCase()}`;
    const cached = await getCache<StockSearchResult[]>(cacheKey);
    if (cached) return cached;

    const payload = await fetchTwelveData<SearchPayload>(
        '/symbol_search',
        { symbol: normalizedQuery, outputsize: '8' },
        apiKey,
    );
    const results = (payload?.data || [])
        .filter((item) => item?.instrument_type === 'Common Stock' || item?.type === 'Common Stock')
        .slice(0, 8)
        .map((item) => ({
            symbol: String(item.symbol || '').toUpperCase(),
            name: item.instrument_name || item.name || String(item.symbol || ''),
            exchange: item.exchange || null,
            country: item.country || null,
        }))
        .filter((item) => item.symbol);
    await setCache(cacheKey, results, SEARCH_CACHE_TTL_MS);
    return results;
}

// Logos are requested only for selected companies, with a long cache and a
// short negative cache. A missing logo must never hide prices or the chart.
async function getLogo(symbol: string, apiKey: string, cacheScope: string) {
    const key = `${cacheScope}:stocks:logo:${symbol}`;
    const cached = await getCache<{ url: string | null }>(key);
    if (cached) return cached.url;
    let url: string | null = null;
    try {
        const payload = await fetchTwelveData<{ url?: string }>('/logo', { symbol }, apiKey);
        const candidate = new URL(String(payload.url));
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

function validateParams(widgetName: string, params: WidgetParams = {}) {
    if (!['stock_market', 'stock_profile'].includes(widgetName)) {
        throw new StockServiceError('Unsupported stock widget', 400, 'STOCK_WIDGET_UNSUPPORTED');
    }
    const symbols = normalizedSymbols(params.symbols);
    if (widgetName === 'stock_profile' && symbols.length !== 1) {
        throw new StockServiceError(
            'Select exactly one company for a stock profile',
            400,
            'STOCK_PROFILE_SINGLE_COMPANY',
        );
    }
    normalizedPeriod(params.period);
}

async function search(query: string, options: ServiceContext) {
    return withStockProvider(getApiKey(options), () => searchUnlocked(query, options));
}

async function execute(widgetName: string, params: WidgetParams, options: ServiceContext) {
    validateParams(widgetName, params);
    return withStockProvider(getApiKey(options), () =>
        executeUnlocked(widgetName, params, options),
    );
}

async function executeUnlocked(widgetName: string, params: WidgetParams, options: ServiceContext) {
    const symbols = normalizedSymbols(params.symbols);
    const period = normalizedPeriod(params.period);
    const apiKey = getApiKey(options);
    const cacheScope = options.cacheScope || 'unscoped';

    // Sequential calls respect the provider budget and preserve a successful first batch.
    const quotes = await getQuotes(symbols, apiKey, cacheScope, options.refreshRate);
    const histories = await getHistory([...quotes.keys()], period, apiKey, cacheScope);
    const available = symbols.filter((symbol) => quotes.has(symbol) && histories.has(symbol));
    const unavailable: Unavailable[] = [];
    for (const symbol of symbols.filter((symbol) => !available.includes(symbol))) {
        unavailable.push(
            (await getCache<Unavailable>(unavailableKey(cacheScope, symbol))) ||
                (await getCache<Unavailable>(unavailableKey(cacheScope, symbol, period))) || {
                    symbol,
                    message: 'No market data available',
                },
        );
    }
    if (!available.length)
        throw new StockServiceError(
            unavailable.map((item) => `${item.symbol}: ${item.message}`).join('; '),
            404,
            'MARKET_DATA_UNAVAILABLE',
        );

    const logos = new Map<string, string | null>();
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

export { StockServiceError };

export default {
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
    // Tests only: empties every cache.
    clearCache,
} satisfies ServiceDefinition & { clearCache: typeof clearCache };
