module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '^shared$': '<rootDir>/../shared/dist/index.js',
    },
    testMatch: ['**/tests/**/*.test.js'],
    // Count every source file, not only the ones a test happens to load.
    collectCoverageFrom: [
        '**/*.js',
        '!**/node_modules/**',
        '!coverage/**',
        '!tests/**',
        '!__mocks__/**',
        '!prisma/**',
        '!scripts/**',
        '!*.config.js',
        '!jest.setup.js',
        '!swagger-docs.js',
        '!server.js',
    ],
    // Regression floor a few points under the current numbers; raise it as coverage grows.
    coverageThreshold: {
        global: { statements: 82, branches: 66, functions: 85, lines: 84 },
    },
};
