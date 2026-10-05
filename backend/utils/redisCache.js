import { createClient } from 'redis';

const localCache = new Map();
let redisClient = null;

if (process.env.REDIS_URL) {
    // Fail commands at once while disconnected instead of queueing them, so callers
    // (cache fallback, rate limiting) never wait on a Redis outage.
    redisClient = createClient({ url: process.env.REDIS_URL, disableOfflineQueue: true });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisClient.connect().catch(console.error);
}

async function getCache(key) {
    if (redisClient && redisClient.isReady) {
        const val = await redisClient.get(key);
        return val ? JSON.parse(val) : null;
    }
    const cached = localCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }
    return null;
}

async function setCache(key, data, ttlMs) {
    if (redisClient && redisClient.isReady) {
        await redisClient.set(key, JSON.stringify(data), { PX: ttlMs });
    } else {
        localCache.set(key, { data, expiresAt: Date.now() + ttlMs });
    }
}

async function deleteCache(key) {
    if (redisClient && redisClient.isReady) {
        await redisClient.del(key);
    } else {
        localCache.delete(key);
    }
}

async function clearCache() {
    if (redisClient && redisClient.isReady) {
        await redisClient.flushAll();
    }
    localCache.clear();
}

export { getCache, setCache, deleteCache, clearCache, redisClient };
