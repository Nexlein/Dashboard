module.exports = {
    createClient: () => ({
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(true),
        isReady: false,
    }),
};
