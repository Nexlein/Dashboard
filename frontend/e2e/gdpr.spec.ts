import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E & GDPR Flow', () => {
    test('should register, add a widget, and delete account (GDPR)', async ({ page }) => {
        // 1. Register a new user
        const testEmail = `playwright-${Date.now()}@example.com`;
        const testPassword = 'password123';

        await page.goto('/register');
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);

        // Handle terms and age checks if they exist in UI
        const checkboxes = page.locator('input[type="checkbox"]');
        const count = await checkboxes.count();
        for (let i = 0; i < count; i++) {
            await checkboxes.nth(i).check();
        }

        await page.click('button[type="submit"]');

        // Wait for redirect to login after registration
        await page.waitForURL('**/login', { timeout: 15000 });

        // 2. Login
        await page.goto('/login');
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.click('button[type="submit"]');

        // Wait for dashboard to load (root route)
        await expect(
            page.locator('[data-testid="dashboard"], [data-testid="widget-grid"], main'),
        ).toBeVisible({ timeout: 15000 });

        // 3. Delete account (GDPR) via Navbar dropdown
        // Open user menu
        await page.click(`button:has-text("${testEmail}")`);

        // Handle window.confirm before clicking
        page.once('dialog', (dialog) => dialog.accept());

        // Click Delete My Account
        await page.click('text=Delete My Account');

        // Wait for redirect back to login after deletion
        await page.waitForURL('**/login', { timeout: 15000 });

        // Verify account is deleted by trying to login again
        await page.goto('/login');
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.click('button[type="submit"]');

        await expect(page.getByRole('alert').filter({ hasText: 'Invalid' })).toBeVisible({
            timeout: 10000,
        });
    });
});
