import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const prices = [
    { timestamp: 1700000000000, price: 100 },
    { timestamp: 1700086400000, price: 110 },
];
const stocks = {
    period: '1M',
    series: [
        { symbol: 'AAPL', name: 'Apple', change: 1.5 },
        { symbol: 'NVDA', name: 'NVIDIA', change: -2.5 },
    ].map((stock) => ({
        ...stock,
        currency: 'USD',
        exchange: 'NASDAQ',
        logo: null,
        currentPrice: 110,
        prices,
    })),
};
const definitions = [
    ['crypto', 'crypto_chart', { coins: 'bitcoin,ethereum', currency: 'eur', days: '7' }],
    ['stocks', 'stock_market', { symbols: 'AAPL,NVDA', period: '1M' }],
    ['youtube', 'channel_watch', { channels: '@alpha' }],
    ['chatbot', 'ai_chat', { model: 'llama3' }],
    ['chatbot', 'ai_chat', { model: 'llama3' }],
    ['crypto', 'crypto_price', { coin: 'bitcoin', currency: 'eur' }],
    ['stocks', 'stock_profile', { symbols: 'AAPL', period: '1M' }],
] as const;
const widgets = definitions.map(([serviceName, widgetName, params], index) => ({
    id: index + 1,
    serviceName,
    widgetName,
    params,
    refreshRate: 600,
    layout: { x: (index % 2) * 6, y: Math.floor(index / 2) * 4, w: 6, h: 4 },
}));
const widgetData: Record<string, unknown> = {
    '/widgets/1/data': {
        currency: 'eur',
        days: 7,
        historyLimited: false,
        series: [
            { coin: 'bitcoin', symbol: 'BTC', change: -2.5 },
            { coin: 'ethereum', symbol: 'ETH', change: 1.5 },
        ].map((coin) => ({ ...coin, image: null, currentPrice: 110, prices })),
    },
    '/widgets/2/data': stocks,
    '/widgets/3/data': {
        channels: [{ id: 'alpha', title: 'Alpha', checkedAt: '2026-10-07T10:00:00Z' }],
        videos: [],
        warnings: [],
    },
    '/widgets/6/data': {
        coin: 'bitcoin',
        currency: 'eur',
        price: 110,
        marketCap: 1000000,
        volume24h: 10000,
        change24h: -2.5,
        lastUpdatedAt: 1700086400,
    },
    '/widgets/7/data': stocks,
};

for (const theme of ['light', 'dark']) {
    test(`${theme}: populated dashboard passes axe and Ollama fields have unique labels`, async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1440, height: 2000 });
        await page.addInitScript((value) => {
            localStorage.setItem('dashboard-theme', value);
            localStorage.setItem('cookie-consent', 'declined');
        }, theme);
        await page.route('http://localhost:8080/**', async (route) => {
            const pathname = new URL(route.request().url()).pathname;
            const body =
                pathname === '/api/auth/get-session'
                    ? {
                          user: { id: '42', name: 'Ada', email: 'ada@example.com', role: 'user' },
                          session: { id: 'session', userId: '42' },
                      }
                    : pathname === '/widgets'
                      ? widgets
                      : pathname === '/services'
                        ? []
                        : (widgetData[pathname] ?? {});
            await route.fulfill({ json: body });
        });

        await page.goto('/');
        await expect(page.getByTestId('crypto-chart')).toBeVisible();
        if (theme === 'dark') {
            await expect(page.locator('html')).toHaveClass(/\bdark\b/);
        } else {
            await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
        }
        await expect(page.getByTestId('stock-market')).toBeVisible();
        await expect(page.getByTestId('crypto-price')).toBeVisible();
        await expect(page.getByTestId('stock-profile')).toBeVisible();
        await expect(page.getByRole('button', { name: 'All channels' })).toBeVisible();
        await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeAttached();
        await expect(page.getByRole('heading', { level: 2 })).toHaveCount(widgets.length);
        const inputs = page.getByRole('textbox', { name: 'Message', exact: true });
        await expect(inputs).toHaveCount(2);
        const ids = await inputs.evaluateAll((elements) => elements.map((element) => element.id));
        expect(ids.every(Boolean)).toBe(true);
        expect(new Set(ids).size).toBe(2);
        for (const input of await inputs.all()) {
            await expect(input).toHaveAttribute('name', 'message');
            await input.fill('Hello');
            await expect(input).toHaveValue('Hello');
        }
        expect(
            (await new AxeBuilder({ page }).analyze()).violations.map((violation) => ({
                rule: violation.id,
                targets: violation.nodes.map((node) => node.target),
            })),
        ).toEqual([]);
    });
}
