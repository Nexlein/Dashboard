import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_URL = 'http://localhost:8080';
export const FRONTEND_ORIGIN = 'http://localhost:5173';

export function uniqueEmail(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

// Better Auth refuses requests whose Origin is not a trusted frontend.
const FROM_FRONTEND = { Origin: FRONTEND_ORIGIN };
export const SESSION_COOKIE = 'dashboard.session_token';

/** Creates an account through the API, then signs that context out again. */
export async function registerUser(request: APIRequestContext, email: string, password: string) {
    const res = await request.post(`${API_URL}/api/auth/sign-up/email`, {
        headers: FROM_FRONTEND,
        data: { email, password, name: 'E2E User', cguAccepted: true, is16OrOlder: true },
    });
    expect(res.status(), await res.text()).toBe(200);
    await request.post(`${API_URL}/api/auth/sign-out`, { headers: FROM_FRONTEND, data: {} });
}

/** Signs in through the API; the session cookie lands in the request context's cookie jar. */
export async function loginViaApi(request: APIRequestContext, email: string, password: string) {
    const res = await request.post(`${API_URL}/api/auth/sign-in/email`, {
        headers: FROM_FRONTEND,
        data: { email, password },
    });
    expect(res.ok(), await res.text()).toBe(true);
    expect(await res.json()).not.toHaveProperty('token');
    const session = res
        .headersArray()
        .find(
            (h) =>
                h.name.toLowerCase() === 'set-cookie' && h.value.startsWith(`${SESSION_COOKIE}=`),
        );
    expect(session?.value).toMatch(/HttpOnly/);
}

/**
 * Registers a fresh user and signs the page in. `page.request` shares the browser context's
 * cookies, so the session cookie set by the login applies to the page too.
 */
export async function signInFreshUser(page: Page) {
    const email = uniqueEmail('e2e');
    const password = 'password1234';
    await registerUser(page.request, email, password);
    await loginViaApi(page.request, email, password);
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'declined'));
    return { email, password };
}
