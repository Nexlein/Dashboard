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
