import { test, expect } from '@playwright/test';

test('dashboard page requires authentication', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
});
