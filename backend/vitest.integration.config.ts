import { defineConfig } from 'vitest/config';

// Integration tests: the real app, Better Auth and Prisma against a disposable PostgreSQL
// database (TEST_DATABASE_URL). Only GitHub is faked (tests/integration/github.ts).
export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/integration/setup.ts'],
        include: ['tests/integration/**/*.test.ts'],
        // One database shared by every file.
        fileParallelism: false,
        unstubGlobals: true,
    },
});
