import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_URL = 'http://localhost:8080';
export const TOKEN_KEY = 'dashboard-auth-token';

export function uniqueEmail(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

export async function registerUser(request: APIRequestContext, email: string, password: string) {
    const res = await request.post(`${API_URL}/auth/register`, {
        data: { email, password, displayName: 'E2E User', cguAccepted: true, is16OrOlder: true },
    });
    expect(res.status(), await res.text()).toBe(201);
}

export async function loginViaApi(request: APIRequestContext, email: string, password: string) {
    const res = await request.post(`${API_URL}/auth/login`, { data: { email, password } });
    expect(res.ok(), await res.text()).toBe(true);
    const { token } = await res.json();
    expect(token).toBeTruthy();
    return token as string;
}

/** Registers a fresh user and starts every page of the test already signed in. */
export async function signInFreshUser(page: Page, request: APIRequestContext) {
    const email = uniqueEmail('e2e');
    const password = 'password1234';
    await registerUser(request, email, password);
    const token = await loginViaApi(request, email, password);
    await page.addInitScript(
        ([key, value]) => {
            localStorage.setItem(key, value);
            localStorage.setItem('cookie-consent', 'declined');
        },
        [TOKEN_KEY, token],
    );
    return { email, password, token };
}
