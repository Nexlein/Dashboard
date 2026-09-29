const { getCache, setCache, clearCache } = require('../utils/redisCache');

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
});
