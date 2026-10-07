const { chromium, expect } = require('@playwright/test');
const path = require('node:path');

module.exports = async (browser, { url }) => {
    // LHCI owns Chrome; Playwright configures its whole context so interception and
    // preferences also apply to the new pages Lighthouse opens for all three runs.
    const connection = await chromium.connectOverCDP(browser.wsEndpoint());
    const context = connection.contexts()[0];
    const origin = new URL(url).origin;
    await context.addInitScript((allowedOrigin) => {
        if (location.origin !== allowedOrigin) return;
        localStorage.setItem('cookie-consent', 'declined');
        localStorage.setItem('dashboard-theme', 'light');
        localStorage.setItem('dashboard-language', 'en');
    }, origin);
    await context.route('**/*', async (route) => {
        const requestUrl = new URL(route.request().url());
        if (requestUrl.origin === origin) {
            await route.continue();
        } else if (requestUrl.href === 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg') {
            await route.fulfill({
                contentType: 'image/svg+xml',
                path: path.join(__dirname, 'thumbnail.svg'),
            });
        } else {
            console.error(`Unexpected external Lighthouse request: ${requestUrl.href}`);
            await route.abort();
        }
    });

    // A passing audit must be a populated dashboard, not a login/loading screen.
    const page = await context.newPage();
    try {
        await page.setViewportSize({ width: 1200, height: 900 });
        await page.goto(url);
        await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeAttached();
        await expect(page.getByRole('heading', { level: 2 })).toHaveCount(5);
        await expect(page.getByTestId('crypto-chart')).toBeVisible();
        await expect(page.getByTestId('stock-market')).toBeAttached();
        await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Play YouTube video' })).toBeAttached();
        await expect(page.getByRole('button', { name: 'All channels' })).toBeAttached();
        await expect(page.locator('img[src*="i.ytimg.com"]')).toHaveJSProperty('naturalWidth', 480);
        console.log('Lighthouse scenario verified: five widgets, fixed media, light theme.');
    } finally {
        await page.close();
    }
    // Keep the connection alive for LHCI. Lighthouse still resets storage/cache
    // normally; the init script restores only the fixed preferences on navigation.
};
