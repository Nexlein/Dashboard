jest.mock('redis', () => ({
    createClient: jest.fn(() => ({
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(),
        isReady: true,
        get: jest.fn().mockResolvedValue(JSON.stringify({ from: 'redis' })),
        set: jest.fn().mockResolvedValue(),
        del: jest.fn().mockResolvedValue(),
        scan: jest.fn().mockResolvedValue({ cursor: 0, keys: ['test_key'] }),
    })),
}));

describe('redisCache utility with Redis', () => {
    let redisModule;
    beforeAll(() => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        jest.isolateModules(() => {
            redisModule = require('../utils/redisCache');
        });
    });

    test('getCache with redis', async () => {
        const res = await redisModule.getCache('key');
        expect(res).toEqual({ from: 'redis' });
    });

    test('getCache empty with redis', async () => {
        redisModule.redisClient.get.mockResolvedValueOnce(null);
        const res = await redisModule.getCache('key2');
        expect(res).toBeNull();
    });

    test('setCache with redis', async () => {
        await redisModule.setCache('key', { data: 1 }, 1000);
        expect(redisModule.redisClient.set).toHaveBeenCalled();
    });

    test('deleteCache with redis', async () => {
        await redisModule.deleteCache('key');
        expect(redisModule.redisClient.del).toHaveBeenCalled();
    });

    test('clearCache with redis', async () => {
        await redisModule.clearCache();
        expect(redisModule.redisClient.scan).toHaveBeenCalled();
    });
});
