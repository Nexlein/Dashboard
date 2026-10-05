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
            env: {
                // Every test registers a fresh user; keep the production auth limit out of the way.
                AUTH_RATE_LIMIT_MAX: '1000',
                // Emails go to Mailpit, where the tests read the codes; never to a real provider
                // configured in backend/.env (environment variables win over the file).
                SMTP_HOST: 'localhost',
                SMTP_PORT: '1025',
                SMTP_SECURE: 'false',
                SMTP_USER: '',
                SMTP_PASSWORD: '',
                MAIL_FROM: '',
            },
            reuseExistingServer: !process.env.CI,
        },
        {
            command: 'cd ../frontend && npm run dev',
            port: 5173,
            reuseExistingServer: !process.env.CI,
        },
    ],
});
