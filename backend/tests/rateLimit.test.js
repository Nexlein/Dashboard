const { EventEmitter } = require('node:events');
const express = require('express');
const request = require('supertest');

const mockStores = [];
const mockInitFailures = [];
jest.mock('rate-limit-redis', () => ({
    RedisStore: jest.fn().mockImplementation(() => {
        const failure = mockInitFailures.shift();
        const store = {
            init: failure
                ? jest.fn().mockRejectedValue(failure)
                : jest.fn().mockResolvedValue(undefined),
            increment: jest.fn().mockResolvedValue({ totalHits: 1, resetTime: new Date() }),
            decrement: jest.fn().mockResolvedValue(undefined),
            resetKey: jest.fn().mockResolvedValue(undefined),
        };
        mockStores.push(store);
        return store;
    }),
}));

const { SharedRedisStore } = require('../utils/rateLimit');

function fakeClient({ ready = false } = {}) {
    const client = new EventEmitter();
    client.isReady = ready;
    client.sendCommand = jest.fn();
    client.becomeReady = () => {
        client.isReady = true;
        client.emit('ready');
    };
    return client;
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
    mockStores.length = 0;
    mockInitFailures.length = 0;
});

describe('SharedRedisStore', () => {
    test('rejects calls until Redis is ready, then delegates to the Redis store', async () => {
        const client = fakeClient();
        const store = new SharedRedisStore(client, 'rl:test:');
        store.init({ windowMs: 1000 });

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
        store.init({ windowMs: 1000 });
        await flush();
        await expect(store.increment('ip')).resolves.toMatchObject({ totalHits: 1 });
    });

    test('retries on the next ready event when loading the scripts failed', async () => {
        const client = fakeClient();
        const store = new SharedRedisStore(client, 'rl:test:');
        store.init({ windowMs: 1000 });
        jest.spyOn(console, 'error').mockImplementation(() => {});

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
        store.init({ windowMs: 1000 });
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
    function appWith(limiter) {
        const app = express();
        app.use(limiter);
        app.get('/', (_req, res) => res.send('ok'));
        return app;
    }

    test('limits requests per IP (in memory under test)', async () => {
        const { createRateLimiter } = require('../utils/rateLimit');
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
        jest.spyOn(console, 'error').mockImplementation(() => {});
        let limiter;
        jest.isolateModules(() => {
            jest.doMock('../utils/redisCache', () => ({ redisClient: fakeClient() }));
            const { createRateLimiter } = require('../utils/rateLimit');
            limiter = createRateLimiter({
                name: 'down',
                windowMs: 60000,
                limit: 1,
                message: 'Slow down',
            });
        });
        process.env.NODE_ENV = previousEnv;

        const app = appWith(limiter);
        for (let i = 0; i < 3; i++) expect((await request(app).get('/')).status).toBe(200);
    });
});
