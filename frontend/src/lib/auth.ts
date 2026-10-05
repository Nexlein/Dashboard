import { createAuthClient } from 'better-auth/client';
import { fetchClient, API_URL } from './apiClient';
import type { RegisterFormData, LoginFormData, UpdateMeFormData, User } from 'shared';

export { API_URL };

/**
 * Better Auth's client for /api/auth/* on the API. The session lives in an httpOnly cookie:
 * the client sends it (credentials: include) but page scripts can never read it.
 */
const authClient = createAuthClient({
    baseURL: API_URL,
    // Look fetch up on each call rather than once at import, like apiClient (tests stub it).
    fetchOptions: { customFetchImpl: (input, init) => fetch(input, init) },
});

type AuthResult<T> = { data: T | null; error: { message?: string; code?: string } | null };

/** The data of a Better Auth call, or an Error carrying its message and code. */
function unwrap<T>({ data, error }: AuthResult<T>): T {
    if (error || data === null) {
        throw Object.assign(new Error(error?.message || 'Une erreur est survenue.'), {
            code: error?.code,
        });
    }
    return data;
}

/** Registers and signs in (the API checks the CGU and age declarations). */
export async function register(payload: RegisterFormData) {
    // cguAccepted and is16OrOlder are checked by the API's sign-up hook, outside Better Auth's
    // own body type: pass them through a variable.
    const body = { ...payload, name: payload.name ?? '' };
    unwrap(await authClient.signUp.email(body));
}

export async function login(payload: LoginFormData) {
    unwrap(await authClient.signIn.email(payload));
}

export async function getCurrentUser(): Promise<User> {
    const session = unwrap(await authClient.getSession());
    if (!session) throw new Error('Not signed in');
    const { id, email, name } = session.user;
    return { id: Number(id), email, name };
}

/** Prefix of the chat histories kept in localStorage by the chatbot widget. */
export const CHAT_HISTORY_PREFIX = 'dashboard-chat-';

/**
 * Ends the session (the API revokes it and clears the cookie), and removes the chat histories
 * kept in this browser so the next person cannot read them.
 */
export async function logout() {
    try {
        unwrap(await authClient.signOut());
    } finally {
        Object.keys(localStorage)
            .filter((key) => key.startsWith(CHAT_HISTORY_PREFIX))
            .forEach((key) => localStorage.removeItem(key));
    }
}

export async function updateProfile(payload: UpdateMeFormData): Promise<User> {
    return fetchClient('/account/profile', { method: 'PUT', body: JSON.stringify(payload) });
}

/** GDPR export of everything stored about the current user. */
export async function exportMyData(): Promise<unknown> {
    return fetchClient('/account/export');
}

/**
 * Deletes the account. Fails with code SESSION_EXPIRED when the last sign-in is more than a
 * day old: the user must sign in again first.
 */
export async function deleteMyAccount() {
    unwrap(await authClient.deleteUser({}));
}

/**
 * Starts GitHub sign-in. Only the registration page passes the declarations: without them the
 * API refuses to create an account.
 */
export async function startGitHubLogin(registration?: {
    cguAccepted: boolean;
    is16OrOlder: boolean;
}) {
    const origin = window.location.origin;
    const { url } = unwrap(
        await authClient.signIn.social({
            provider: 'github',
            callbackURL: `${origin}/`,
            errorCallbackURL: `${origin}${registration ? '/register' : '/login'}`,
            disableRedirect: true,
            ...(registration && { requestSignUp: true, additionalData: registration }),
        }),
    );
    if (url) window.location.assign(url);
}

/** Links an OAuth provider (e.g. GitHub) to the signed-in account; returns where to go. */
export async function getOAuthLinkUrl(provider: string): Promise<string> {
    const origin = window.location.origin;
    const { url } = unwrap(
        await authClient.linkSocial({
            provider,
            callbackURL: `${origin}/services?linked=${provider}`,
            errorCallbackURL: `${origin}/services`,
            disableRedirect: true,
        }),
    );
    return url;
}
