import { rateLimit, type IncrementResponse, type Options, type Store } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { redisClient } from './redisCache.ts';

/**
 * express-rate-limit store whose counters live in Redis, so every replica shares them.
 *
 * - While Redis is unavailable each call throws at once and the limiter lets the request
 *   through (passOnStoreError): a Redis outage must not take the API down.
 * - The underlying RedisStore loads its Lua scripts in init() and never retries a failed
 *   load, so it is only created once the client is ready, and again on the next `ready`
 *   event if that load fails.
 */
/** The part of the node-redis client the store needs (tests pass a fake). */
export type RedisLike = {
    isReady: boolean;
    on(event: 'ready', listener: () => void): unknown;
    sendCommand(args: string[]): Promise<unknown>;
};

class SharedRedisStore implements Store {
    client: RedisLike;
    prefix: string;
    store: RedisStore | null = null;
    localKeys = false;

    constructor(client: RedisLike, prefix: string) {
        this.client = client;
        this.prefix = prefix;
    }

    init(options: Options) {
        const start = () => {
            if (this.store) return;
            const store = new RedisStore({
                prefix: this.prefix,
                sendCommand: (...args: string[]) =>
                    this.client.sendCommand(args) as Promise<RedisReply>,
            });
            Promise.resolve(store.init(options))
                .then(() => {
                    this.store = store;
                })
                .catch((error: Error) =>
                    console.error(`Rate limit store ${this.prefix}:`, error.message),
                );
        };
        this.client.on('ready', start);
        if (this.client.isReady) start();
    }

    available(): this is { store: RedisStore } {
        return this.store !== null && this.client.isReady;
    }

    async increment(key: string): Promise<IncrementResponse> {
        if (!this.available()) throw new Error('Redis is unavailable');
        return this.store.increment(key);
    }

    async decrement(key: string) {
        if (this.available()) await this.store.decrement(key);
    }

    async resetKey(key: string) {
        if (this.available()) await this.store.resetKey(key);
    }
}

/**
 * Creates a limiter counting requests per IP over `windowMs`. Counters are shared through
 * Redis when REDIS_URL is set, and kept in memory otherwise (tests, single local process).
 */
/** Adapts the node-redis client to the minimal interface used by SharedRedisStore. */
function toRedisLike(redis: NonNullable<typeof redisClient>): RedisLike {
    return {
        get isReady() {
            return redis.isReady;
        },
        on: (event, listener) => redis.on(event, listener),
        sendCommand: (args) => redis.sendCommand(args),
    };
}

type LimiterOptions = { name: string; windowMs: number; limit: number; message: string };

function createRateLimiter({ name, windowMs, limit, message }: LimiterOptions) {
    const client = redisClient && process.env.NODE_ENV !== 'test' ? toRedisLike(redisClient) : null;
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: message },
        passOnStoreError: true,
        ...(client && { store: new SharedRedisStore(client, `rl:${name}:`) }),
    });
}

export { createRateLimiter, SharedRedisStore };
