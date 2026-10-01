import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
    test('Auth page visual snapshot', async ({ page }) => {
        await page.goto('/auth');
        await expect(page).toHaveScreenshot('auth-page.png');
    });
});
