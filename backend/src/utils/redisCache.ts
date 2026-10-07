import { createClient } from 'redis';

type CacheEntry = { data: unknown; expiresAt: number };

// Without Redis (local development, tests, or Redis down) entries live in this process.
// Expired entries are dropped when read, and the oldest go once the map is full.
const MAX_LOCAL_ENTRIES = 1000;
const localCache = new Map<string, CacheEntry>();
let redisClient: ReturnType<typeof createClient> | null = null;

if (process.env.REDIS_URL) {
    // Fail commands at once while disconnected instead of queueing them, so callers
    // (cache fallback, rate limiting) never wait on a Redis outage.
    redisClient = createClient({ url: process.env.REDIS_URL, disableOfflineQueue: true });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisClient.connect().catch(console.error);
}

/** The shared Redis client when it can take commands; null means use the local cache. */
function sharedClient() {
    return redisClient?.isReady ? redisClient : null;
}

function getLocal<T>(key: string): T | null {
    const cached = localCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt > Date.now()) return cached.data as T;
    localCache.delete(key);
    return null;
}

function setLocal(key: string, data: unknown, ttlMs: number) {
    localCache.delete(key); // re-insert last, so the map stays ordered by write
    localCache.set(key, { data, expiresAt: Date.now() + ttlMs });
    while (localCache.size > MAX_LOCAL_ENTRIES) {
        localCache.delete(localCache.keys().next().value!);
    }
}

// A failing Redis command (connection lost mid-request) must not fail the widget: the
// request falls back to the local cache, as when Redis is not configured.
async function getCache<T = unknown>(key: string): Promise<T | null> {
    const client = sharedClient();
    if (client) {
        try {
            const val = await client.get(key);
            return val ? (JSON.parse(val) as T) : null;
        } catch (error) {
            console.warn('Redis read failed, using the local cache:', (error as Error).message);
        }
    }
    return getLocal<T>(key);
}

async function setCache(key: string, data: unknown, ttlMs: number) {
    const client = sharedClient();
    if (client) {
        try {
            await client.set(key, JSON.stringify(data), { PX: ttlMs });
            return;
        } catch (error) {
            console.warn('Redis write failed, using the local cache:', (error as Error).message);
        }
    }
    setLocal(key, data, ttlMs);
}

/** Empties every cache. Tests only: on Redis it also drops the rate-limit counters. */
async function clearCache() {
    await sharedClient()?.flushAll();
    localCache.clear();
}

// Requests for a key this process is already loading wait for that load.
const inFlight = new Map<string, Promise<unknown>>();

/**
 * The cached value of `key`, or the result of `load` stored for `ttlMs`. Concurrent calls for
 * the same key in this process share one `load` (e.g. two widgets for the same city), so the
 * provider is called once. A failed `load` is not cached.
 */
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = await getCache<T>(key);
    if (hit !== null) return hit;

    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const request = (async () => {
        const value = await load();
        await setCache(key, value, ttlMs);
        return value;
    })();
    inFlight.set(key, request);
    try {
        return await request;
    } finally {
        inFlight.delete(key);
    }
}

const MIN_REFRESH_RATE_SECONDS = 60;
const MAX_CACHE_TTL_MS = 5 * 60 * 1000;

/** How long a widget's data stays cached: its refresh rate, between one and five minutes. */
function widgetCacheTtl(refreshRate: unknown): number {
    const seconds = Number(refreshRate);
    const rate = Number.isFinite(seconds)
        ? Math.max(seconds, MIN_REFRESH_RATE_SECONDS)
        : MIN_REFRESH_RATE_SECONDS;
    return Math.min(rate * 1000, MAX_CACHE_TTL_MS);
}

export { getCache, setCache, clearCache, cached, widgetCacheTtl, redisClient };
