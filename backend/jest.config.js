module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '^shared$': '<rootDir>/../shared/dist/index.js',
    },
    testMatch: ['**/tests/**/*.test.js'],
};
