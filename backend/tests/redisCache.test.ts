import { describe, test, expect, beforeEach, vi } from 'vitest';
import { cached, clearCache, getCache, setCache, widgetCacheTtl } from '../src/utils/redisCache.ts';

describe('redisCache utility (fallback mode)', () => {
    beforeEach(async () => {
        await clearCache();
    });

    test('should set and get cache successfully', async () => {
        await setCache('test_key', { hello: 'world' }, 5000);
        const cached = await getCache('test_key');
        expect(cached).toEqual({ hello: 'world' });
    });

    test('should return null for expired cache', async () => {
        await setCache('test_key', { hello: 'world' }, 1); // Expires immediately
        await new Promise((r) => setTimeout(r, 10)); // wait for expiry
        const cached = await getCache('test_key');
        expect(cached).toBeNull();
    });

    test('should clear cache successfully', async () => {
        await setCache('test_key', { hello: 'world' }, 5000);
        await clearCache();
        const cached = await getCache('test_key');
        expect(cached).toBeNull();
    });

    test('keeps the most recent entries once the local cache is full', async () => {
        for (let i = 0; i <= 1000; i += 1) await setCache(`key-${i}`, i, 60_000);

        expect(await getCache('key-0')).toBeNull();
        expect(await getCache('key-1')).toBe(1);
        expect(await getCache('key-1000')).toBe(1000);
    });
});

describe('cached', () => {
    beforeEach(async () => {
        await clearCache();
    });

    test('loads once, then serves the cached value until it expires', async () => {
        const load = vi.fn(async () => ({ temperature: 18 }));

        expect(await cached('weather:paris', 60_000, load)).toEqual({ temperature: 18 });
        expect(await cached('weather:paris', 60_000, load)).toEqual({ temperature: 18 });

        expect(load).toHaveBeenCalledOnce();
    });

    test('shares one load between concurrent requests for the same key', async () => {
        let finish!: (value: string) => void;
        const load = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));

        const requests = Promise.all([
            cached('key', 60_000, load),
            cached('key', 60_000, load),
            cached('key', 60_000, load),
        ]);
        await vi.waitFor(() => expect(load).toHaveBeenCalled());
        finish('fresh');

        expect(await requests).toEqual(['fresh', 'fresh', 'fresh']);
        expect(load).toHaveBeenCalledOnce();
    });

    test('does not cache a failed load: the next request tries again', async () => {
        const load = vi
            .fn<() => Promise<string>>()
            .mockRejectedValueOnce(new Error('provider down'))
            .mockResolvedValueOnce('recovered');

        await expect(cached('key', 60_000, load)).rejects.toThrow('provider down');
        expect(await cached('key', 60_000, load)).toBe('recovered');
    });
});

describe('widgetCacheTtl', () => {
    test.each([
        [undefined, 60_000],
        [30, 60_000],
        [120, 120_000],
        [3600, 300_000],
    ])('caches a widget refreshed every %s s for %i ms', (refreshRate, ttl) => {
        expect(widgetCacheTtl(refreshRate)).toBe(ttl);
    });
});
