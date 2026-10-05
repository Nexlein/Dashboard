import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts'],
        // Need a real PostgreSQL database: vitest.integration.config.ts.
        exclude: ['tests/integration/**'],
        // Undo vi.stubGlobal (e.g. stubFetch) after every test.
        unstubGlobals: true,
        coverage: {
            // Count every source file, not only the ones a test happens to load.
            include: ['src/**/*.ts'],
            exclude: [
                'src/server.ts',
                'src/swagger-docs.ts',
                'src/generated/**',
                // Better Auth's configuration: mocked here, run for real by tests/integration.
                'src/auth.ts',
            ],
            // Regression floor a few points under the current numbers; raise it as coverage grows.
            thresholds: { statements: 82, branches: 66, functions: 85, lines: 84 },
        },
    },
});
