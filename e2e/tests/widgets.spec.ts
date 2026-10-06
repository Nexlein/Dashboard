import { test, expect } from '@playwright/test';
import { API_URL, FRONTEND_ORIGIN, signInFreshUser } from './helpers';

const MODEL = 'llama3.2:1b';

test.describe('Dashboard widgets', () => {
    test.beforeEach(async ({ page }) => {
        await signInFreshUser(page);
        // Ollama is external infrastructure that is not available in CI: stub only
        // the model listing. Widget creation and rendering go through the real API.
        await page.route(`${API_URL}/chatbot/models`, (route) =>
            route.fulfill({ json: { models: [{ name: MODEL }] } }),
        );
    });

    test('adds an Ollama widget through the configurator', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Add Widget' }).click();

        const dialog = page.getByRole('dialog', { name: 'Add New Widget' });
        await dialog.getByRole('combobox', { name: 'Service' }).click();
        await page.getByRole('option', { name: 'Ollama' }).click();
        await dialog.getByRole('button', { name: 'Select' }).first().click();
        await dialog.getByRole('button', { name: 'Add to Dashboard' }).click();

        await expect(dialog).toBeHidden();
        await expect(page.getByText(`Ollama - ${MODEL}`)).toBeVisible();

        await page.reload();
        await expect(page.getByText(`Ollama - ${MODEL}`)).toBeVisible();
    });

    test('adds a YouTube player without a timer or data requests', async ({ page }) => {
        const dataRequests: string[] = [];
        page.on('request', (request) => {
            if (/\/widgets\/\d+\/data/.test(request.url())) dataRequests.push(request.url());
        });
        await page.route('https://i.ytimg.com/**', (route) => route.fulfill({ status: 204 }));
        await page.route('https://www.youtube-nocookie.com/**', (route) =>
            route.fulfill({ contentType: 'text/html', body: '<p>Test video player</p>' }),
        );
        await page.goto('/');
        await page.getByRole('button', { name: 'Add Widget' }).click();
        const dialog = page.getByRole('dialog', { name: 'Add New Widget' });
        await dialog.getByRole('combobox', { name: 'Service' }).click();
        await page.getByRole('option', { name: 'YouTube' }).click();
        await dialog.getByRole('combobox', { name: 'Widget Type' }).click();
        await page.getByRole('option', { name: 'Video Player' }).click();
        await expect(dialog.getByLabel('Refresh Rate (seconds)')).toBeHidden();
        await dialog.getByLabel('YouTube video link').fill('https://youtu.be/M7lc1UVf-VE');
        await dialog.getByRole('button', { name: 'Add to Dashboard' }).click();
        await expect(dialog).toBeHidden();
        await page.getByRole('button', { name: 'Play YouTube video' }).click();
        await expect(page.getByTitle('YouTube video player')).toHaveAttribute(
            'src',
            'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1&autoplay=1',
        );
        await page.getByRole('button', { name: 'Stop video' }).click();
        await expect(page.getByTitle('YouTube video player')).toBeHidden();
        await page.reload();
        await expect(page.getByRole('button', { name: 'Play YouTube video' })).toBeVisible();
        expect(dataRequests).toEqual([]);
    });

    test('adds and edits a YouTube watch with its configured timer and manual refresh', async ({
        page,
    }) => {
        const feedRequests: string[] = [];
        await page.route(`${API_URL}/widgets/*/data*`, (route) => {
            feedRequests.push(route.request().url());
            return route.fulfill({
                json: {
                    channels: [{ id: 'alpha', title: 'Alpha', checkedAt: '2026-10-06T12:00:00Z' }],
                    videos: [
                        {
                            id: 'M7lc1UVf-VE',
                            title: 'Latest publication',
                            channelId: 'alpha',
                            channelTitle: 'Alpha',
                            publishedAt: '2026-10-06T10:00:00Z',
                            url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
                            thumbnail: 'https://i.ytimg.com/vi/M7lc1UVf-VE/mqdefault.jpg',
                        },
                    ],
                    warnings: [],
                },
            });
        });
        await page.route('https://i.ytimg.com/**', (route) => route.fulfill({ status: 204 }));
        await page.goto('/');
        await page.getByRole('button', { name: 'Add Widget' }).click();
        const dialog = page.getByRole('dialog', { name: 'Add New Widget' });
        await dialog.getByRole('combobox', { name: 'Service' }).click();
        await page.getByRole('option', { name: 'YouTube' }).click();
        await dialog.getByRole('combobox', { name: 'Widget Type' }).click();
        await page.getByRole('option', { name: 'Channel Watch' }).click();
        await dialog.getByRole('textbox', { name: 'YouTube channels', exact: true }).fill('@alpha');
        await dialog.getByRole('button', { name: 'Add channel' }).click();
        await dialog.getByLabel('Refresh Rate (seconds)').fill('120');
        await dialog.getByRole('button', { name: 'Add to Dashboard' }).click();
        await expect(dialog).toBeHidden();
        await expect(page.getByText('Latest publication')).toBeVisible();
        await expect(page.getByText(/Updates every 2 min/)).toBeVisible();
        await page.getByRole('button', { name: 'Refresh publications' }).click();
        await expect
            .poll(() => feedRequests.some((url) => url.endsWith('?refresh=true')))
            .toBe(true);
        await page.getByRole('button', { name: 'Configure YouTube Watch' }).click();
        await page.getByRole('menuitem', { name: 'Edit' }).click();
        const edit = page.getByRole('dialog', { name: 'Edit Widget' });
        await expect(edit.getByLabel('Refresh Rate (seconds)')).toHaveValue('120');
        await edit.getByLabel('Refresh Rate (seconds)').fill('180');
        await edit.getByRole('button', { name: 'Save Changes' }).click();
        await expect(edit).toBeHidden();
        await expect(page.getByText(/Updates every 3 min/)).toBeVisible();
        await page.reload();
        await expect(page.getByText(/Updates every 3 min/)).toBeVisible();
        const saved = await (await page.request.get(`${API_URL}/widgets`)).json();
        expect(saved[0]).toMatchObject({ widgetName: 'channel_watch', refreshRate: 180 });
    });

    test('deletes a widget', async ({ page }) => {
        // Cookie-authenticated writes must come from the frontend origin (CSRF check).
        const res = await page.request.post(`${API_URL}/widgets`, {
            headers: { Origin: FRONTEND_ORIGIN },
            data: {
                serviceName: 'chatbot',
                widgetName: 'ai_chat',
                params: { model: MODEL },
                refreshRate: 60,
                layout: { x: 0, y: 0, w: 2, h: 3 },
            },
        });
        expect(res.status(), await res.text()).toBe(201);

        await page.goto('/');
        const title = `Ollama - ${MODEL}`;
        await expect(page.getByText(title)).toBeVisible();

        page.once('dialog', (d) => d.accept());
        await page.getByRole('button', { name: `Configure ${title}` }).click();
        await page.getByRole('menuitem', { name: 'Delete' }).click();

        await expect(page.getByText(title)).toBeHidden();
        await page.reload();
        await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();
        await expect(page.getByText(title)).toBeHidden();
    });
});
