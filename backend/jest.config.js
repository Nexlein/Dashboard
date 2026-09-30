'use strict';

/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    forceExit: false,
    coverageDirectory: 'coverage',
    setupFiles: ['<rootDir>/tests/setup.js'],
    coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
    coverageThreshold: {
        global: {
            branches: 70,
            lines: 70,
            functions: 70,
        },
    },
};
