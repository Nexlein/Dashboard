const { createClient } = require('redis');

const localCache = new Map();
let redisClient = null;

// Prefix all keys so we never collide with rate-limiter or other namespaces
const KEY_PREFIX = 'dashboard:cache:';

function prefixed(key) {
    return `${KEY_PREFIX}${key}`;
}

if (process.env.REDIS_URL) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisClient.connect().catch(console.error);
}

async function getCache(key) {
    if (redisClient && redisClient.isReady) {
        const val = await redisClient.get(prefixed(key));
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
        await redisClient.set(prefixed(key), JSON.stringify(data), { PX: ttlMs });
    } else {
        localCache.set(key, { data, expiresAt: Date.now() + ttlMs });
    }
}

async function deleteCache(key) {
    if (redisClient && redisClient.isReady) {
        await redisClient.del(prefixed(key));
    } else {
        localCache.delete(key);
    }
}

async function clearCache() {
    if (redisClient && redisClient.isReady) {
        // Scan and delete only our prefixed keys — never flushAll (would wipe rate limiter state)
        let cursor = 0;
        do {
            const reply = await redisClient.scan(cursor, { MATCH: `${KEY_PREFIX}*`, COUNT: 100 });
            cursor = reply.cursor;
            if (reply.keys.length > 0) {
                await redisClient.del(reply.keys);
            }
        } while (cursor !== 0);
    }
    localCache.clear();
}

module.exports = { getCache, setCache, deleteCache, clearCache, redisClient };
