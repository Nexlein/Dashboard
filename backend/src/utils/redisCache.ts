import { createClient } from 'redis';

type CacheEntry = { data: unknown; expiresAt: number };

const localCache = new Map<string, CacheEntry>();
let redisClient: ReturnType<typeof createClient> | null = null;

if (process.env.REDIS_URL) {
    // Fail commands at once while disconnected instead of queueing them, so callers
    // (cache fallback, rate limiting) never wait on a Redis outage.
    redisClient = createClient({ url: process.env.REDIS_URL, disableOfflineQueue: true });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisClient.connect().catch(console.error);
}

async function getCache<T = unknown>(key: string): Promise<T | null> {
    if (redisClient && redisClient.isReady) {
        const val = await redisClient.get(key);
        return val ? (JSON.parse(val) as T) : null;
    }
    const cached = localCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
    }
    return null;
}

async function setCache(key: string, data: unknown, ttlMs: number) {
    if (redisClient && redisClient.isReady) {
        await redisClient.set(key, JSON.stringify(data), { PX: ttlMs });
    } else {
        localCache.set(key, { data, expiresAt: Date.now() + ttlMs });
    }
}

async function clearCache() {
    if (redisClient && redisClient.isReady) {
        await redisClient.flushAll();
    }
    localCache.clear();
}

export { getCache, setCache, clearCache, redisClient };
