import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_URL = 'http://localhost:8080';
export const FRONTEND_ORIGIN = 'http://localhost:5173';
/** Mailpit's API: the inbox that catches the emails of the backend under test. */
export const MAILPIT_URL = 'http://localhost:8025';

export function uniqueEmail(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

// Better Auth refuses requests whose Origin is not a trusted frontend.
const FROM_FRONTEND = { Origin: FRONTEND_ORIGIN };
export const SESSION_COOKIE = 'dashboard.session_token';

type MailpitSearch = { messages: { ID: string; Subject: string }[] };

/**
 * The 6-digit code of the latest email sent to `email` whose subject contains `subject`,
 * read from Mailpit (emails are sent in the background: wait for it).
 */
export async function emailedCode(request: APIRequestContext, email: string, subject: string) {
    let id: string | undefined;
    await expect
        .poll(
            async () => {
                const res = await request.get(`${MAILPIT_URL}/api/v1/search`, {
                    params: { query: `to:"${email}"` },
                });
                const { messages } = (await res.json()) as MailpitSearch;
                id = messages.find((message) => message.Subject.includes(subject))?.ID;
                return id;
            },
            { message: `no "${subject}" email for ${email}`, timeout: 10_000 },
        )
        .toBeTruthy();
    const message = await (await request.get(`${MAILPIT_URL}/api/v1/message/${id}`)).json();
    const code = /\b(\d{6})\b/.exec(message.Text)?.[1];
    expect(code, 'code in the email').toBeTruthy();
    return code!;
}

/** Creates a verified account through the API, then signs that context out again. */
export async function registerUser(request: APIRequestContext, email: string, password: string) {
    const res = await request.post(`${API_URL}/api/auth/sign-up/email`, {
        headers: FROM_FRONTEND,
        data: { email, password, name: 'E2E User', cguAccepted: true, is16OrOlder: true },
    });
    expect(res.status(), await res.text()).toBe(200);
    const otp = await emailedCode(request, email, 'vérification');
    const verified = await request.post(`${API_URL}/api/auth/email-otp/verify-email`, {
        headers: FROM_FRONTEND,
        data: { email, otp },
    });
    expect(verified.ok(), await verified.text()).toBe(true);
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
