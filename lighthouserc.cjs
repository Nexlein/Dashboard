const { createRequire } = require('node:module');
const path = require('node:path');
const e2eRequire = createRequire(path.join(__dirname, 'e2e/package.json'));
const { chromium } = e2eRequire('@playwright/test');

module.exports = {
    ci: {
        collect: {
            url: ['http://127.0.0.1:4174/'],
            numberOfRuns: 3,
            startServerCommand: 'node lighthouse/server.mjs',
            startServerReadyPattern: 'Lighthouse fixture ready',
            chromePath: process.env.CHROME_PATH || chromium.executablePath(),
            puppeteerScript: 'lighthouse/browser.cjs',
            puppeteerLaunchOptions: {
                args: process.env.CI ? ['--no-sandbox'] : [],
            },
            settings: {
                // Match the desktop profile used for the original dashboard audit.
                preset: 'desktop',
                screenEmulation: {
                    mobile: false,
                    width: 1200,
                    height: 900,
                    deviceScaleFactor: 1,
                    disabled: false,
                },
            },
        },
        assert: {
            includePassedAssertions: true,
            assertions: {
                'categories:performance': [
                    'error',
                    { minScore: 0.95, aggregationMethod: 'median' },
                ],
                // Require at least 95 in every run for the non-timing categories.
                'categories:accessibility': [
                    'error',
                    { minScore: 0.95, aggregationMethod: 'pessimistic' },
                ],
                'categories:best-practices': [
                    'error',
                    { minScore: 0.95, aggregationMethod: 'pessimistic' },
                ],
                'categories:seo': ['error', { minScore: 0.95, aggregationMethod: 'pessimistic' }],
            },
        },
        upload: {
            target: 'filesystem',
            outputDir: path.join(__dirname, 'lighthouse-reports'),
        },
    },
};
