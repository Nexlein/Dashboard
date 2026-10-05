import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.test.js'],
        coverage: {
            // Count every source file, not only the ones a test happens to load.
            include: ['**/*.js'],
            exclude: [
                'coverage/**',
                'tests/**',
                '__mocks__/**',
                'prisma/**',
                '*.config.js',
                'swagger-docs.js',
                'server.js',
            ],
            // Regression floor a few points under the current numbers; raise it as coverage grows.
            thresholds: { statements: 82, branches: 66, functions: 85, lines: 84 },
        },
    },
});
