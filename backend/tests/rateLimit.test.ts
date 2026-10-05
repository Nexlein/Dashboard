import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import { EventEmitter } from 'node:events';
import express, { type RequestHandler } from 'express';
import type { Options } from 'express-rate-limit';
import request from 'supertest';

// Shared with the hoisted vi.mock factory below.
const { mockStores, mockInitFailures } = vi.hoisted(() => ({
    mockStores: [] as Record<'init' | 'increment' | 'decrement' | 'resetKey', Mock>[],
    mockInitFailures: [] as Error[],
}));
vi.mock('rate-limit-redis', () => ({
    RedisStore: vi.fn(function () {
        const failure = mockInitFailures.shift();
        const store = {
            init: failure
                ? vi.fn().mockRejectedValue(failure)
                : vi.fn().mockResolvedValue(undefined),
            increment: vi.fn().mockResolvedValue({ totalHits: 1, resetTime: new Date() }),
            decrement: vi.fn().mockResolvedValue(undefined),
            resetKey: vi.fn().mockResolvedValue(undefined),
        };
        mockStores.push(store);
        return store;
    }),
}));

import { SharedRedisStore, createRateLimiter, type RedisLike } from '../src/utils/rateLimit.ts';

class FakeRedis extends EventEmitter implements RedisLike {
    isReady: boolean;
    sendCommand = vi.fn();

    constructor(ready: boolean) {
        super();
        this.isReady = ready;
    }

    becomeReady() {
        this.isReady = true;
        this.emit('ready');
    }
}

function fakeClient({ ready = false } = {}) {
    return new FakeRedis(ready);
}
// The store only reads windowMs from the limiter options.
const OPTIONS = { windowMs: 1000 } as Options;
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
    mockStores.length = 0;
    mockInitFailures.length = 0;
});

describe('SharedRedisStore', () => {
    test('rejects calls until Redis is ready, then delegates to the Redis store', async () => {
        const client = fakeClient();
        const store = new SharedRedisStore(client, 'rl:test:');
        store.init(OPTIONS);

        await expect(store.increment('ip')).rejects.toThrow(/unavailable/);
        expect(mockStores).toHaveLength(0);

        client.becomeReady();
        await flush();
        await store.increment('ip');
        expect(mockStores).toHaveLength(1);
        expect(mockStores[0].init).toHaveBeenCalledWith({ windowMs: 1000 });
        expect(mockStores[0].increment).toHaveBeenCalledWith('ip');
    });

    test('starts immediately when the client is already connected', async () => {
        const store = new SharedRedisStore(fakeClient({ ready: true }), 'rl:test:');
        store.init(OPTIONS);
        await flush();
        await expect(store.increment('ip')).resolves.toMatchObject({ totalHits: 1 });
    });

    test('retries on the next ready event when loading the scripts failed', async () => {
        const client = fakeClient();
        const store = new SharedRedisStore(client, 'rl:test:');
        store.init(OPTIONS);
        vi.spyOn(console, 'error').mockImplementation(() => {});

        mockInitFailures.push(new Error('connection lost'));
        client.becomeReady();
        await flush();
        await expect(store.increment('ip')).rejects.toThrow(/unavailable/);

        client.becomeReady();
        await flush();
        await expect(store.increment('ip')).resolves.toBeDefined();
        expect(mockStores).toHaveLength(2);
    });

    test('rejects again while the connection is down, without calling Redis', async () => {
        const client = fakeClient({ ready: true });
        const store = new SharedRedisStore(client, 'rl:test:');
        store.init(OPTIONS);
        await flush();

        client.isReady = false;
        await expect(store.increment('ip')).rejects.toThrow(/unavailable/);
        await store.decrement('ip');
        await store.resetKey('ip');
        expect(mockStores[0].increment).not.toHaveBeenCalled();
        expect(mockStores[0].decrement).not.toHaveBeenCalled();
        expect(mockStores[0].resetKey).not.toHaveBeenCalled();
    });
});

describe('createRateLimiter', () => {
    function appWith(limiter: RequestHandler) {
        const app = express();
        app.use(limiter);
        app.get('/', (_req, res) => res.send('ok'));
        return app;
    }

    test('limits requests per IP (in memory under test)', async () => {
        const app = appWith(
            createRateLimiter({ name: 'mem', windowMs: 60000, limit: 2, message: 'Slow down' }),
        );
        expect((await request(app).get('/')).status).toBe(200);
        expect((await request(app).get('/')).status).toBe(200);
        const blocked = await request(app).get('/');
        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual({ error: 'Slow down' });
    });

    test('lets requests through when Redis is unavailable instead of failing or waiting', async () => {
        const previousEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        vi.spyOn(console, 'error').mockImplementation(() => {});
        // Fresh copy of utils/rateLimit bound to a Redis client that never becomes ready.
        vi.resetModules();
        vi.doMock('../src/utils/redisCache.ts', () => ({ redisClient: fakeClient() }));
        const isolated = await import('../src/utils/rateLimit.ts');
        const limiter = isolated.createRateLimiter({
            name: 'down',
            windowMs: 60000,
            limit: 1,
            message: 'Slow down',
        });
        vi.doUnmock('../src/utils/redisCache.ts');
        process.env.NODE_ENV = previousEnv;

        const app = appWith(limiter);
        for (let i = 0; i < 3; i++) expect((await request(app).get('/')).status).toBe(200);
    });
});
