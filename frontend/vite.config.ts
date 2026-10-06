import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
    test: {
        environment: 'happy-dom',
        // Assert embed markup in unit tests without loading third-party players.
        environmentOptions: {
            happyDOM: { settings: { disableIframePageLoading: true } },
        },
        globals: true,
        setupFiles: './src/test/setup.ts',
        coverage: {
            // Count every source file, not only the ones a test happens to load.
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/test/**',
                'src/test-utils.tsx',
                'src/main.tsx',
                'src/components/ui/**',
            ],
            // Regression floor a few points under the current numbers; raise it as coverage grows.
            thresholds: { statements: 82, branches: 76, functions: 78, lines: 85 },
        },
    },
});
