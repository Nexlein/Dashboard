import { test, expect } from '@playwright/test';
import { SESSION_COOKIE, emailedCode, registerUser, uniqueEmail } from './helpers';

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

    // The account signs in once the emailed code is entered.
    await expect(page.getByText('Vérifiez votre adresse e-mail')).toBeVisible();
    const code = await emailedCode(page.request, email, 'vérification');
    await page.getByLabel('Code de vérification').fill(code);
    await page.getByRole('button', { name: 'Vérifier' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();

    await page.getByRole('button', { name: /Ouvrir le menu du compte/ }).click();
    await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();
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

test('keeps the session token out of reach of page scripts', async ({ page }) => {
    const email = uniqueEmail('cookie');
    const password = 'password1234';
    await registerUser(page.request, email, password);

    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();

    const session = (await page.context().cookies()).find((c) => c.name === SESSION_COOKIE);
    expect(session?.httpOnly).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain(SESSION_COOKIE);
    // Page scripts cannot obtain the token either: not stored, not in the session response.
    const token = session!.value.split('.')[0];
    const stored = await page.evaluate(() =>
        JSON.stringify({ ...localStorage, ...sessionStorage }),
    );
    expect(stored).not.toContain(token);
    const sessionBody = await page.evaluate(async (api) => {
        const res = await fetch(`${api}/api/auth/get-session`, { credentials: 'include' });
        return res.text();
    }, 'http://localhost:8080');
    expect(sessionBody).toContain(email);
    expect(sessionBody).not.toContain(token);
});

test('resets a forgotten password with the emailed code', async ({ page, request }) => {
    const email = uniqueEmail('reset');
    await registerUser(request, email, 'password1234');

    await page.goto('/login');
    await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click();
    // The sign-in page also has an "Adresse e-mail" field: wait for the new page.
    await expect(page.getByRole('heading', { name: 'Mot de passe oublié' })).toBeVisible();
    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByRole('button', { name: 'Recevoir un code' }).click();

    const code = await emailedCode(request, email, 'mot de passe');
    await page.getByLabel('Code reçu par e-mail').fill(code);
    await page.getByLabel('Nouveau mot de passe').fill('a-new-password-123');
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toContainText('Mot de passe modifié');
    await page.getByLabel('Adresse e-mail').fill(email);
    await page.getByLabel('Mot de passe', { exact: true }).fill('a-new-password-123');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();
});
