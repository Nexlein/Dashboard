import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInFreshUser } from './helpers';

async function scan(page: Page) {
    const results = await new AxeBuilder({ page }).analyze();
    return results.violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        targets: v.nodes.map((n) => n.target.join(' ')),
    }));
}

test.describe('Accessibility', () => {
    for (const path of ['/login', '/register']) {
        test(`${path} has no axe violations`, async ({ page }) => {
            await page.goto(path);
            await page.waitForSelector('main');
            expect(await scan(page)).toEqual([]);
        });
    }

    test.describe('with a dark OS color scheme', () => {
        test.use({ colorScheme: 'dark' });

        for (const path of ['/login', '/register']) {
            test(`${path} keeps the light theme`, async ({ page }) => {
                await page.goto(path);
                await page.waitForSelector('main');
                // The auth card is light-only; axe cannot measure contrast through its
                // translucent background, so assert the theme directly.
                await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
                expect(await scan(page)).toEqual([]);
            });
        }
    });

    test('dashboard has no axe violations', async ({ page, request }) => {
        await signInFreshUser(page, request);
        await page.goto('/');
        await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();
        expect(await scan(page)).toEqual([]);
    });
});
