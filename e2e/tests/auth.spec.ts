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
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByLabel(/Terms of Service/).check();
    await page.getByLabel('I confirm I am at least 16 years old.').check();
    await page.getByRole('button', { name: 'Create my account' }).click();

    // The account signs in once the emailed code is entered.
    await expect(page.getByText('Verify your email address')).toBeVisible();
    const code = await emailedCode(page.request, email, 'vérification');
    await page.getByLabel('Verification code').fill(code);
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();

    await page.getByRole('button', { name: /Open the account menu/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();
});

test('shows an error for wrong credentials', async ({ page, request }) => {
    const email = uniqueEmail('badpass');
    await registerUser(request, email, 'password1234');

    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
});

test('keeps the session token out of reach of page scripts', async ({ page }) => {
    const email = uniqueEmail('cookie');
    const password = 'password1234';
    await registerUser(page.request, email, password);

    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
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
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    // The sign-in page also has an "Email address" field: wait for the new page.
    await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible();
    await page.getByLabel('Email address').fill(email);
    await page.getByRole('button', { name: 'Receive a code' }).click();

    const code = await emailedCode(request, email, 'mot de passe');
    await page.getByLabel('Code received by email').fill(code);
    await page.getByLabel('New password').fill('a-new-password-123');
    await page.getByRole('button', { name: 'Change password' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toContainText('Password changed');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('a-new-password-123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Add Widget' })).toBeVisible();
});
