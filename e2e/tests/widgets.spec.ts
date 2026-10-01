import { test, expect } from '@playwright/test';

test.describe('Dashboard Widgets', () => {
    test.beforeEach(async ({ page, request }) => {
        // Register and login a fresh user
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

        // Inject token
        await page.goto('/');
        await page.evaluate((t) => localStorage.setItem('dashboard-auth-token', t), token);
        await page.goto('/');
    });

    test('can open widget configurator and add a widget', async ({ page }) => {
        // Wait for dashboard to load
        await expect(page.locator('text=Add Widget')).toBeVisible();

        // Open Dialog
        await page.click('text=Add Widget');
        await expect(page.locator('text=Add New Widget')).toBeVisible();

        // Select Service (e.g. Chatbot, doesn't require connection)
        await page.click('button[role="combobox"]');
        await page.click('text=Ollama AI');

        // Select Widget Type
        await page.click('button[id="widgetType"]');
        await page.click('text=AI Chatbot');

        // Add
        await page.click('button:has-text("Add to Dashboard")');

        // Dialog should close and widget should appear
        await expect(page.locator('text=Add New Widget')).toBeHidden();

        // Wait for the chatbot widget to render (Look for the type text or standard chat UI)
        await expect(page.locator('text=Ai Chatbot').first()).toBeVisible();
        await expect(page.getByTestId('chatbot-widget')).toBeVisible();
    });
});
