import { defineConfig, devices } from '@playwright/test';

/** UI translation checks against the production build, with a deterministic API fixture. */
export default defineConfig({
    testDir: './tests',
    testMatch: ['i18n.spec.ts', 'best-practices.spec.ts'],
    workers: 1,
    reporter: 'list',
    use: { baseURL: 'http://127.0.0.1:4173', locale: 'en-US', ...devices['Desktop Chrome'] },
    webServer: {
        command: 'npm run preview -w frontend -- --host 127.0.0.1 --port 4173 --strictPort',
        cwd: '..',
        port: 4173,
        reuseExistingServer: !process.env.CI,
    },
});
