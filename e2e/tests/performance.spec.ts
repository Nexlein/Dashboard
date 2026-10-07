import { test, expect } from '@playwright/test';

test('loads selected widgets, preloads the video preview and defers the Ollama model manager', async ({
    page,
}) => {
    const thumbnail = 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg';
    const scripts: string[] = [];
    const frames: string[] = [];
    let thumbnailRequests = 0;
    page.on('request', (request) => {
        if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
        if (request.url().includes('youtube-nocookie.com/embed')) frames.push(request.url());
    });
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'declined'));
    await page.route(thumbnail, async (route) => {
        thumbnailRequests++;
        await route.fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#444"/></svg>',
        });
    });
    await page.route('http://localhost:8080/**', async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        const bodies: Record<string, unknown> = {
            '/api/auth/get-session': {
                user: { id: '42', name: 'Ada', email: 'ada@example.com', role: 'user' },
                session: { id: 'session', userId: '42' },
            },
            '/widgets': [
                {
                    id: 1,
                    serviceName: 'youtube',
                    widgetName: 'video_player',
                    params: { video_url: 'https://youtu.be/M7lc1UVf-VE' },
                    refreshRate: 600,
                    layout: { x: 0, y: 0, w: 6, h: 4 },
                },
            ],
            '/services': [],
            '/about.json': {
                client: { host: '127.0.0.1' },
                server: {
                    current_time: 1,
                    services: [
                        {
                            name: 'chatbot',
                            widgets: [
                                {
                                    name: 'ai_chat',
                                    description: 'Ollama chat',
                                    params: [{ name: 'model', type: 'string' }],
                                },
                            ],
                        },
                    ],
                },
            },
            '/chatbot/models': { models: [{ name: 'llama3:latest' }] },
        };
        await route.fulfill({ json: bodies[pathname] ?? {} });
    });
    let releaseVideo!: () => void;
    const videoBlocked = new Promise<void>((resolve) => (releaseVideo = resolve));
    await page.route('**/assets/YouTubeVideoWidget-*.js', async (route) => {
        await videoBlocked;
        await route.continue();
    });
    try {
        await page.goto('/');
        await expect
            .poll(() => scripts.some((script) => script.includes('YouTubeVideoWidget-')))
            .toBe(true);
        // The request starts while the video component's code is still downloading.
        await expect.poll(() => thumbnailRequests).toBe(1);
        await expect(
            page.locator(`link[rel="preload"][as="image"][href="${thumbnail}"]`),
        ).toHaveCount(1);
        expect(frames).toEqual([]);
        releaseVideo();
        await expect(page.getByRole('button', { name: 'Play YouTube video' })).toBeVisible();
        await expect(page.locator(`img[src="${thumbnail}"]`)).toBeVisible();
        expect(thumbnailRequests).toBe(1);
        const unused =
            /WeatherWidgets-|GithubWidgets-|Crypto(?:ChartWidget|Price)-|Stock(?:Market|Profile)Widget-|ChatbotWidget-|OllamaModelManager-/;
        expect(scripts.filter((script) => unused.test(script))).toEqual([]);

        await page.getByRole('button', { name: 'Add Widget', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Add New Widget' });
        await expect(dialog).toBeVisible();
        expect(scripts.filter((script) => script.includes('OllamaModelManager-'))).toEqual([]);
        await dialog.getByRole('combobox', { name: 'Service', exact: true }).click();
        await page.getByRole('option', { name: 'Ollama', exact: true }).click();
        await expect(dialog.getByRole('heading', { name: 'Recommended Models' })).toBeVisible();
        expect(scripts.filter((script) => script.includes('OllamaModelManager-'))).toHaveLength(1);
        expect(scripts.filter((script) => script.includes('ChatbotWidget-'))).toEqual([]);
    } finally {
        releaseVideo();
    }
});
