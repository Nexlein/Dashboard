import { describe, test, expect, vi, beforeEach } from 'vitest';

// A Redis client that reports itself ready; each test decides how its commands behave.
const redis = vi.hoisted(() => ({
    store: new Map<string, string>(),
    get: vi.fn(),
    set: vi.fn(),
}));
vi.mock('redis', () => ({
    createClient: () => ({
        isReady: true,
        on: vi.fn(),
        connect: vi.fn(async () => {}),
        get: redis.get,
        set: redis.set,
    }),
}));

async function loadCache() {
    vi.stubEnv('REDIS_URL', 'redis://redis:6379');
    vi.resetModules();
    const cache = await import('../src/utils/redisCache.ts');
    vi.unstubAllEnvs();
    return cache;
}

beforeEach(() => {
    redis.store.clear();
    redis.get.mockReset();
    redis.set.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('redisCache when Redis commands fail', () => {
    test('reads and writes the local cache when every command fails', async () => {
        redis.get.mockRejectedValue(new Error('Connection is closed'));
        redis.set.mockRejectedValue(new Error('Connection is closed'));
        const { getCache, setCache } = await loadCache();

        await expect(setCache('key', { ok: true }, 60_000)).resolves.toBeUndefined();
        expect(await getCache('key')).toEqual({ ok: true });
    });

    test('serves the local copy when Redis reads work but refuses writes (full)', async () => {
        redis.get.mockResolvedValue(null);
        redis.set.mockRejectedValue(new Error('OOM command not allowed'));
        const { cached } = await loadCache();
        const load = vi.fn(async () => ({ temperature: 18 }));

        await cached('weather:paris', 60_000, load);
        expect(await cached('weather:paris', 60_000, load)).toEqual({ temperature: 18 });

        expect(load).toHaveBeenCalledOnce();
    });

    test('drops the local copy once Redis accepts writes again', async () => {
        redis.get.mockImplementation(async (key: string) => redis.store.get(key) ?? null);
        redis.set.mockRejectedValueOnce(new Error('OOM command not allowed'));
        redis.set.mockImplementation(async (key: string, value: string) => {
            redis.store.set(key, value);
        });
        const { getCache, setCache } = await loadCache();

        await setCache('key', 'old', 60_000); // refused: kept locally
        await setCache('key', 'new', 60_000); // accepted by Redis
        redis.store.delete('key'); // e.g. expired or evicted in Redis

        expect(await getCache('key')).toBeNull();
    });
});
