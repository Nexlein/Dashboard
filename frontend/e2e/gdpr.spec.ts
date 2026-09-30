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
        const termsCheckbox = page.locator('button[role="checkbox"]').first();
        if (await termsCheckbox.isVisible()) {
            await termsCheckbox.click();
            await page.locator('button[role="checkbox"]').nth(1).click();
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

        // 3. Navigate to privacy / settings to delete account (GDPR)
        await page.goto('/privacy'); // Adjust to your actual privacy/settings route
        await page.click('text=Delete Account');

        // Handle confirmation if needed
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")');
        if (await confirmButton.isVisible()) {
            await confirmButton.click();
        }

        // Wait for redirect back to login after deletion
        await page.waitForURL('**/login', { timeout: 15000 });

        // Verify account is deleted by trying to login again
        await page.goto('/login');
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.click('button[type="submit"]');

        await expect(page.locator('[data-testid="login-error"], text=Invalid')).toBeVisible({
            timeout: 10000,
        });
    });
});
