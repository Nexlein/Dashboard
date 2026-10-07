import { describe, test, expect, vi } from 'vitest';

// A Redis client that reports itself ready but fails every command (connection lost
// mid-request): the cache must fall back to this process instead of failing the widget.
vi.mock('redis', () => ({
    createClient: () => ({
        isReady: true,
        on: vi.fn(),
        connect: vi.fn(async () => {}),
        get: vi.fn(async () => {
            throw new Error('Connection is closed');
        }),
        set: vi.fn(async () => {
            throw new Error('Connection is closed');
        }),
    }),
}));

describe('redisCache when Redis commands fail', () => {
    test('reads and writes the local cache instead of throwing', async () => {
        vi.stubEnv('REDIS_URL', 'redis://redis:6379');
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.resetModules();
        const { getCache, setCache } = await import('../src/utils/redisCache.ts');

        await expect(setCache('key', { ok: true }, 60_000)).resolves.toBeUndefined();
        expect(await getCache('key')).toEqual({ ok: true });

        vi.unstubAllEnvs();
    });
});
