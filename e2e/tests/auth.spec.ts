import { test, expect } from '@playwright/test';
import { registerUser, uniqueEmail } from './helpers';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'declined'));
});

test('redirects unauthenticated visitors to the login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page).toHaveTitle(/Dashboard/i);
});

test('registers, signs in and signs out through the UI', async ({ page }) => {
    const email = uniqueEmail('auth');
    const password = 'password1234';

    await page.goto('/register');
    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByLabel(/conditions générales/).check();
    await page.getByLabel(/16 ans ou plus/).check();
    await page.getByRole('button', { name: 'Créer mon compte' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Adresse e-mail')).toHaveValue(email);

    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();

    await page.getByRole('button', { name: /Ouvrir le menu du compte/ }).click();
    await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/login$/);
});

test('shows an error for wrong credentials', async ({ page, request }) => {
    const email = uniqueEmail('badpass');
    await registerUser(request, email, 'password1234');

    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByLabel('Mot de passe').fill('wrong-password');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
});
