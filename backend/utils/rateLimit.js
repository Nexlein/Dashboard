import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from './redisCache.js';

/**
 * express-rate-limit store whose counters live in Redis, so every replica shares them.
 *
 * - While Redis is unavailable each call throws at once and the limiter lets the request
 *   through (passOnStoreError): a Redis outage must not take the API down.
 * - The underlying RedisStore loads its Lua scripts in init() and never retries a failed
 *   load, so it is only created once the client is ready, and again on the next `ready`
 *   event if that load fails.
 */
class SharedRedisStore {
    constructor(client, prefix) {
        this.client = client;
        this.prefix = prefix;
        this.store = null;
        this.localKeys = false;
    }

    init(options) {
        const start = () => {
            if (this.store) return;
            const store = new RedisStore({
                prefix: this.prefix,
                sendCommand: (...args) => this.client.sendCommand(args),
            });
            Promise.resolve(store.init(options))
                .then(() => {
                    this.store = store;
                })
                .catch((error) => console.error(`Rate limit store ${this.prefix}:`, error.message));
        };
        this.client.on('ready', start);
        if (this.client.isReady) start();
    }

    available() {
        return this.store !== null && this.client.isReady;
    }

    async increment(key) {
        if (!this.available()) throw new Error('Redis is unavailable');
        return this.store.increment(key);
    }

    async decrement(key) {
        if (this.available()) await this.store.decrement(key);
    }

    async resetKey(key) {
        if (this.available()) await this.store.resetKey(key);
    }
}

/**
 * Creates a limiter counting requests per IP over `windowMs`. Counters are shared through
 * Redis when REDIS_URL is set, and kept in memory otherwise (tests, single local process).
 */
function createRateLimiter({ name, windowMs, limit, message }) {
    const useRedis = redisClient && process.env.NODE_ENV !== 'test';
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: message },
        passOnStoreError: true,
        ...(useRedis && { store: new SharedRedisStore(redisClient, `rl:${name}:`) }),
    });
}

export { createRateLimiter, SharedRedisStore };
