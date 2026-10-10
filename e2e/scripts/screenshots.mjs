// Takes the screenshots of docs/user-guide.md (docs/screenshots/*.png).
//
// Needs the backend and the frontend dev servers (npm run dev -w backend / -w frontend) and the
// demo accounts (SEED_DEMO_DATA=true or `npx prisma db seed`). It signs in as the demo
// administrator; widget data and service states are fixed examples, so no provider key is needed.
//
//   node e2e/scripts/screenshots.mjs
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const FRONTEND = 'http://localhost:5173';
const API = 'http://localhost:8080';
const OUT = new URL('../../docs/screenshots/', import.meta.url);

const prices = (start, drift) =>
    Array.from({ length: 30 }, (_, day) => ({
        timestamp: Date.UTC(2026, 8, 10 + day),
        price: start * (1 + (drift * day) / 30 + Math.sin(day / 3) * 0.02),
    }));

const widgets = [
    ['weather', 'current_weather', { city: 'Paris' }, { x: 0, y: 0, w: 3, h: 3 }],
    ['weather', 'forecast', { city: 'Lyon' }, { x: 3, y: 0, w: 5, h: 3 }],
    ['github', 'repo_stats', { owner: 'facebook', repo: 'react' }, { x: 8, y: 0, w: 4, h: 3 }],
    [
        'crypto',
        'crypto_chart',
        { coins: 'bitcoin,ethereum', currency: 'eur', days: '30' },
        { x: 0, y: 3, w: 6, h: 5 },
    ],
    [
        'stocks',
        'stock_market',
        { symbols: 'AAPL,NVDA,MSFT', period: '1M' },
        { x: 6, y: 3, w: 6, h: 5 },
    ],
].map(([serviceName, widgetName, params, layout], index) => ({
    id: index + 1,
    serviceName,
    widgetName,
    params,
    refreshRate: 300,
    layout,
}));

const days = ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'];
const widgetData = {
    1: {
        type: 'current_weather',
        location: { name: 'Paris', country: 'FR' },
        observedAt: 1791640000,
        temperature: 17,
        feelsLike: 16,
        humidity: 62,
        windSpeed: 3.4,
        condition: 'few clouds',
        conditionCode: 801,
        icon: '02d',
    },
    2: {
        type: 'forecast',
        location: { name: 'Lyon', country: 'FR' },
        days: days.map((date, i) => ({
            date,
            min: 9 + i,
            max: 18 + (i % 3),
            precipitationProbability: [10, 60, 20, 0, 30][i],
            condition: ['clear sky', 'light rain', 'few clouds', 'clear sky', 'broken clouds'][i],
            conditionCode: [800, 500, 801, 800, 803][i],
            icon: ['01d', '10d', '02d', '01d', '04d'][i],
        })),
    },
    3: {
        name: 'facebook/react',
        description: 'The library for web and native user interfaces.',
        stars: 241000,
        forks: 49800,
        open_issues: 812,
    },
    4: {
        type: 'crypto_chart',
        currency: 'eur',
        days: 30,
        historyLimited: false,
        series: [
            ['bitcoin', 'BTC', 'Bitcoin', 58000, 0.08],
            ['ethereum', 'ETH', 'Ethereum', 2300, -0.04],
        ].map(([coin, symbol, name, start, drift]) => {
            const series = prices(start, drift);
            return {
                coin,
                symbol,
                name,
                image: null,
                currentPrice: series.at(-1).price,
                change: drift * 100,
                prices: series,
            };
        }),
    },
    5: {
        type: 'stock_market',
        period: '1M',
        series: [
            ['AAPL', 'Apple Inc', 228, 0.05],
            ['NVDA', 'NVIDIA Corp', 121, 0.11],
            ['MSFT', 'Microsoft Corp', 415, -0.02],
        ].map(([symbol, name, start, drift]) => {
            const series = prices(start, drift);
            return {
                symbol,
                name,
                currency: 'USD',
                exchange: 'NASDAQ',
                logo: null,
                currentPrice: series.at(-1).price,
                change: drift * 10,
                prices: series,
            };
        }),
    },
};

const service = (name, displayName, connected, extra = {}) => ({
    name,
    displayName,
    description: null,
    configurable: true,
    connectionType: 'apiKey',
    credentialLabel: `${displayName} API key`,
    documentationUrl: null,
    connected,
    keyHint: connected ? 'a1b2' : null,
    verifiedAt: connected ? '2026-10-01T10:00:00.000Z' : null,
    ...extra,
});
const services = [
    service('weather', 'OpenWeather', true),
    service('crypto', 'CoinGecko', true),
    service('stocks', 'Twelve Data', false),
    service('github', 'GitHub', true, {
        connectionType: 'oauth',
        credentialLabel: null,
        provider: 'github-service',
        keyHint: null,
        accounts: [{ id: 1, login: 'ada-lovelace', avatarUrl: null }],
    }),
];

const adminUser = (id, name, email, role, createdAt, ban = {}) => ({
    id,
    name,
    email,
    role,
    emailVerified: true,
    banned: Boolean(ban.reason),
    banReason: ban.reason ?? null,
    banExpires: ban.expires ?? null,
    image: null,
    createdAt,
    updatedAt: createdAt,
});

// Example accounts for the Administration page; the signed-in admin keeps its real id.
let adminUsers = [];

/** Replaces the user's widgets, their data and the service states by the examples above. */
async function useExamples(page) {
    await page.route(`${API}/widgets`, (route) =>
        route.request().method() === 'GET' ? route.fulfill({ json: widgets }) : route.continue(),
    );
    await page.route(`${API}/widgets/layout`, (route) => route.fulfill({ status: 204 }));
    await page.route(new RegExp(`${API}/widgets/(\\d+)/data`), (route) => {
        const id = route
            .request()
            .url()
            .match(/widgets\/(\d+)\/data/)[1];
        return route.fulfill({ json: widgetData[id] });
    });
    await page.route(`${API}/services`, (route) => route.fulfill({ json: services }));
}

async function shot(page, name) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800); // charts and grid animations settle
    await page.screenshot({ path: new URL(`${name}.png`, OUT).pathname });
    console.log(`docs/screenshots/${name}.png`);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    reducedMotion: 'reduce',
});
await context.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'declined');
    if (!localStorage.getItem('dashboard-language'))
        localStorage.setItem('dashboard-language', 'en');
});
const page = await context.newPage();

await page.goto(`${FRONTEND}/login`);
await shot(page, 'login');

await page.getByLabel('Email address').fill('admin@dashboard.local');
await page.getByLabel('Password').fill('admin1234');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(`${FRONTEND}/`);

await useExamples(page);
await page.goto(`${FRONTEND}/`);
await page.getByText('facebook/react').waitFor();
await shot(page, 'dashboard');

await page.getByRole('button', { name: 'Add Widget' }).click();
const dialog = page.getByRole('dialog');
await dialog.getByRole('combobox', { name: 'Service' }).click();
await page.getByRole('option', { name: 'Weather' }).click();
await dialog.getByRole('combobox', { name: 'Widget Type' }).click();
await page.getByRole('option', { name: '5-Day Forecast' }).click();
await dialog.getByRole('textbox').first().fill('Marseille');
await shot(page, 'add-widget');
await page.keyboard.press('Escape');

await page.goto(`${FRONTEND}/services`);
await page.getByText('ada-lovelace').waitFor();
await shot(page, 'services');

const session = await page.evaluate(
    (api) =>
        fetch(`${api}/api/auth/get-session`, { credentials: 'include' }).then((res) => res.json()),
    API,
);
adminUsers = [
    adminUser(
        session.user.id,
        'Admin Master',
        'admin@dashboard.local',
        'admin',
        '2026-10-01T09:00:00Z',
    ),
    adminUser('demo-2', 'John Doe', 'user@dashboard.local', 'user', '2026-10-01T09:00:00Z'),
    adminUser('demo-3', 'Ada Lovelace', 'ada@example.com', 'admin', '2026-10-03T14:20:00Z'),
    adminUser('demo-4', 'Alan Turing', 'alan@example.com', 'user', '2026-10-05T08:45:00Z'),
    adminUser('demo-5', 'Grace Hopper', 'grace@example.com', 'user', '2026-10-07T17:10:00Z'),
    adminUser('demo-6', 'Spam Bot', 'bot@example.com', 'user', '2026-10-08T03:02:00Z', {
        reason: 'Spam',
        expires: '2026-11-08T03:02:00Z',
    }),
];
await page.route(/\/api\/auth\/admin\/list-users/, (route) => {
    const query = new URL(route.request().url()).searchParams;
    const field = query.get('filterField');
    const value = query.get('filterValue');
    const matching = adminUsers.filter((user) => !field || String(user[field]) === value);
    const offset = Number(query.get('offset') ?? 0);
    const limit = Number(query.get('limit') ?? matching.length);
    return route.fulfill({
        json: {
            users: matching.slice(offset, offset + limit),
            total: matching.length,
            limit,
            offset,
        },
    });
});
await page.goto(`${FRONTEND}/admin`);
await page.getByText('grace@example.com').waitFor();
await shot(page, 'admin');

await page.goto(`${FRONTEND}/`);
await page.getByRole('button', { name: 'Accessibility settings' }).click();
await page.getByRole('dialog', { name: 'Accessibility' }).waitFor();
await shot(page, 'accessibility');
await page.keyboard.press('Escape');

// The same dashboard in French and the dark theme.
await page.evaluate(() => {
    localStorage.setItem('dashboard-language', 'fr');
    localStorage.setItem('vite-ui-theme', 'dark');
});
await page.reload();
await page.getByText('facebook/react').waitFor();
await shot(page, 'dashboard-dark-fr');
await page.evaluate(() => {
    localStorage.setItem('dashboard-language', 'en');
    localStorage.setItem('vite-ui-theme', 'light');
});

await browser.close();
