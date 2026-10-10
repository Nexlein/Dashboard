import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { API_URL, FRONTEND_ORIGIN, signInFreshUser } from './helpers';

async function axeViolations(page: Page) {
    const results = await new AxeBuilder({ page }).analyze();
    return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`);
}

/** Two chatbot widgets side by side: they render without any external service. */
async function addTwoWidgets(page: Page) {
    for (const x of [0, 6]) {
        const res = await page.request.post(`${API_URL}/widgets`, {
            headers: { Origin: FRONTEND_ORIGIN },
            data: {
                serviceName: 'chatbot',
                widgetName: 'ai_chat',
                params: { model: `model-${x}` },
                refreshRate: 60,
                layout: { x, y: 0, w: 6, h: 4 },
            },
        });
        expect(res.status(), await res.text()).toBe(201);
    }
}

test.describe('Accessibility settings', () => {
    test.beforeEach(async ({ page }) => {
        await signInFreshUser(page);
        await page.route(`${API_URL}/chatbot/models`, (route) =>
            route.fulfill({ json: { models: [] } }),
        );
    });

    test('keeps large text and high contrast after a reload, without axe violations', async ({
        page,
    }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Accessibility settings' }).click();
        const dialog = page.getByRole('dialog', { name: 'Accessibility' });
        await dialog.getByText('200%').click();
        await dialog.getByText('High contrast').click();
        await dialog.getByRole('button', { name: 'Done' }).click();

        // Focus goes back to the button that opened the dialog.
        await expect(page.getByRole('button', { name: 'Accessibility settings' })).toBeFocused();

        await page.reload();
        await expect(page.locator('html')).toHaveCSS('font-size', '32px');
        await expect(page.locator('html')).toHaveClass(/a11y-contrast/);
        await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();
        expect(await axeViolations(page)).toEqual([]);
    });

    test('moves a widget with the keyboard and keeps it after a reload', async ({ page }) => {
        await addTwoWidgets(page);
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.goto('/');

        const handle = page.getByRole('button', { name: /Move or resize Ollama - model-0/ });
        await handle.focus();
        await page.keyboard.press('Shift+ArrowLeft'); // 6 → 5 columns wide
        await page.keyboard.press('ArrowRight'); // column 1 → 2

        await expect(
            page.getByRole('status').filter({ hasText: 'moved to column 2' }),
        ).toBeAttached();
        await expect(handle).toBeFocused();

        await expect
            .poll(async () => {
                const res = await page.request.get(`${API_URL}/widgets`);
                const widgets = (await res.json()) as {
                    params: { model: string };
                    layout: unknown;
                }[];
                return widgets.find((w) => w.params.model === 'model-0')?.layout;
            })
            .toMatchObject({ x: 1, w: 5 });
    });

    test('lets keyboard users skip the navigation', async ({ page }) => {
        await page.goto('/services');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.keyboard.press('Tab');
        const skip = page.getByRole('link', { name: 'Skip to content' });
        await expect(skip).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('#main-content')).toBeFocused();
        await expect(page).toHaveTitle('Services · Dashboard');
    });
});
