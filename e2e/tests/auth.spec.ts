import { test, expect } from '@playwright/test';

test('has title and can navigate to login', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Dashboard/i);
});
