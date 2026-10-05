import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    retries: 0,
    workers: 1,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: [
        {
            command: 'cd ../backend && npm run dev',
            port: 8080,
            // Every test registers a fresh user; keep the production auth limit out of the way.
            env: { AUTH_RATE_LIMIT_MAX: '1000' },
            reuseExistingServer: !process.env.CI,
        },
        {
            command: 'cd ../frontend && npm run dev',
            port: 5173,
            reuseExistingServer: !process.env.CI,
        },
    ],
});
