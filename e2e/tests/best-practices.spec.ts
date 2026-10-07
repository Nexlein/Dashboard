import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const imageUrl = 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png';
const productionCsp = readFileSync(
    path.resolve(__dirname, '../../frontend/nginx/default.conf.template'),
    'utf8',
)
    .match(/add_header Content-Security-Policy "([^"]+)"/)![1]
    .replace('${API_ORIGIN}', 'http://localhost:8080');

test('loads coin images without cookies or CSP violations under production security headers', async ({
    page,
    context,
}) => {
    await context.addCookies([
        {
            name: 'third-party-consent',
            value: 'existing-cookie',
            domain: 'coin-images.coingecko.com',
            path: '/',
            secure: true,
            sameSite: 'None',
        },
    ]);
    await page.route('http://localhost:8080/**', async (route) => {
        const path = new URL(route.request().url()).pathname;
        const body =
            path === '/api/auth/get-session'
                ? {
                      user: { id: '42', name: 'Ada', email: 'ada@example.com', role: 'user' },
                      session: { id: 'test', userId: '42' },
                  }
                : path === '/widgets'
                  ? [
                        {
                            id: 1,
                            serviceName: 'crypto',
                            widgetName: 'crypto_chart',
                            params: { coins: 'bitcoin', currency: 'eur', days: '7' },
                            refreshRate: 600,
                            layout: { x: 0, y: 0, w: 6, h: 5 },
                        },
                    ]
                  : path === '/widgets/1/data'
                    ? {
                          currency: 'eur',
                          days: 7,
                          historyLimited: false,
                          series: [
                              {
                                  coin: 'bitcoin',
                                  symbol: 'BTC',
                                  name: 'Bitcoin',
                                  image: imageUrl,
                                  currentPrice: 63000,
                                  change: 1,
                                  prices: [
                                      { timestamp: 1700000000000, price: 62000 },
                                      { timestamp: 1700086400000, price: 63000 },
                                  ],
                              },
                          ],
                      }
                    : path === '/services'
                      ? []
                      : {};
        await route.fulfill({ json: body });
    });
    const imageCookies: (string | undefined)[] = [];
    await page.route(imageUrl, async (route) => {
        imageCookies.push((await route.request().allHeaders()).cookie);
        await route.fulfill({
            contentType: 'image/png',
            body: Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1sAAAAASUVORK5CYII=',
                'base64',
            ),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Set-Cookie': 'new-tracker=blocked; SameSite=None; Secure; Path=/',
            },
        });
    });
    await page.route(
        (url) => url.origin === new URL(test.info().project.use.baseURL!).origin,
        async (route) => {
            if (route.request().resourceType() !== 'document') return route.continue();
            const response = await route.fetch();
            await route.fulfill({
                response,
                headers: { ...response.headers(), 'Content-Security-Policy': productionCsp },
            });
        },
    );
    const violations: unknown[] = [];
    const cdp = await context.newCDPSession(page);
    await cdp.send('Audits.enable');
    cdp.on('Audits.issueAdded', ({ issue }) => {
        if (['ContentSecurityPolicyIssue', 'CookieIssue'].includes(issue.code))
            violations.push(issue);
    });
    await page.goto('/');
    await expect(page.getByTestId('crypto-chart')).toBeVisible();
    const logos = page.locator('img[data-testid="crypto-logo-bitcoin"]');
    await expect(logos.first()).toBeVisible();
    await expect
        .poll(() =>
            logos.evaluateAll((images) =>
                images.every(
                    (image) =>
                        (image as HTMLImageElement).complete &&
                        (image as HTMLImageElement).naturalWidth > 0,
                ),
            ),
        )
        .toBe(true);
    expect(imageCookies.length).toBeGreaterThan(0);
    expect(imageCookies.every((cookie) => cookie === undefined)).toBe(true);
    expect((await context.cookies(imageUrl)).some((cookie) => cookie.name === 'new-tracker')).toBe(
        false,
    );
    expect(violations).toEqual([]);
    // Exercise shared schema validation as well as the initial Zod capability probe.
    await page.goto('/login');
    await page.getByLabel('Email address').fill('ada@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Secret123');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByTestId('crypto-chart')).toBeVisible();
    expect(violations).toEqual([]);
});
