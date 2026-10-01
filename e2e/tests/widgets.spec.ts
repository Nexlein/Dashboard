import { test, expect } from '@playwright/test';

test.describe('Dashboard Widgets', () => {
    test.beforeEach(async ({ page, request }) => {
        const ts = Date.now();
        const email = `widgetuser${ts}@example.com`;
        const password = 'password1234';

        await request.post('http://localhost:8080/auth/register', {
            data: {
                email,
                password,
                displayName: 'Widget User',
                cguAccepted: true,
                is16OrOlder: true,
            },
        });

        const loginRes = await request.post('http://localhost:8080/auth/login', {
            data: { email, password },
        });
        const { token } = await loginRes.json();

        await page.goto('/');
        await page.evaluate((t) => localStorage.setItem('dashboard-auth-token', t), token);
        await page.goto('/');
    });

    test('can open widget configurator dialog', async ({ page }) => {
        await expect(page.locator('text=Add Widget')).toBeVisible();

        await page.click('text=Add Widget');
        await expect(page.locator('text=Add New Widget')).toBeVisible();

        // Select Service
        await page.click('button[role="combobox"]');
        await page.click('text=Ollama');
        await expect(page.locator('text=Recommended Models')).toBeVisible();

        // Dialog still open — verified content visible above
    });
});
