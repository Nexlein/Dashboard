import { createAuthClient } from 'better-auth/client';
import { adminClient, emailOTPClient } from 'better-auth/client/plugins';
import { fetchClient, API_URL } from './apiClient';
import type { RegisterFormData, LoginFormData, ProfileFormData, User } from 'shared';

export { API_URL };

/**
 * Better Auth's client for /api/auth/* on the API. The session lives in an httpOnly cookie:
 * the client sends it (credentials: include) but page scripts can never read it.
 */
export const authClient = createAuthClient({
    baseURL: API_URL,
    plugins: [emailOTPClient(), adminClient()],
    // Look fetch up on each call rather than once at import, like apiClient (tests stub it).
    fetchOptions: { customFetchImpl: (input, init) => fetch(input, init) },
});

type AuthResult<T> = { data: T | null; error: { message?: string; code?: string } | null };

/** The data of a Better Auth call, or an Error carrying its message and code. */
export function unwrap<T>({ data, error }: AuthResult<T>): T {
    if (error || data === null) {
        throw Object.assign(new Error(error?.message || 'Une erreur est survenue.'), {
            code: error?.code,
        });
    }
    return data;
}

/**
 * Registers (the API checks the CGU and age declarations) and emails a code: the account
 * signs in once verifyEmailCode accepts it.
 */
export async function register(payload: RegisterFormData) {
    // cguAccepted and is16OrOlder are checked by the API's sign-up hook, outside Better Auth's
    // own body type: pass them through a variable.
    const body = { ...payload, name: payload.name ?? '' };
    unwrap(await authClient.signUp.email(body));
}

/** Signs in. Fails with code EMAIL_NOT_VERIFIED (and a new code is emailed) until verified. */
export async function login(payload: LoginFormData) {
    unwrap(await authClient.signIn.email(payload));
}

/** Enters the emailed code: verifies the address and signs in. */
export async function verifyEmailCode(email: string, otp: string) {
    unwrap(await authClient.emailOtp.verifyEmail({ email, otp }));
}

export async function resendVerificationCode(email: string) {
    unwrap(await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }));
}

/** Forgotten password, step 1: emails a code (same answer for unknown addresses). */
export async function requestPasswordReset(email: string) {
    unwrap(await authClient.emailOtp.requestPasswordReset({ email }));
}

/** Forgotten password, step 2: sets the new password and signs every session out. */
export async function resetPassword(email: string, otp: string, password: string) {
    unwrap(await authClient.emailOtp.resetPassword({ email, otp, password }));
}

export async function getCurrentUser(): Promise<User> {
    const session = unwrap(await authClient.getSession());
    if (!session) throw new Error('Not signed in');
    const { id, email, name, role } = session.user;
    return { id: Number(id), email, name, role: role === 'admin' ? 'admin' : 'user' };
}

/** Prefix of the chat histories kept in localStorage by the chatbot widget. */
export const CHAT_HISTORY_PREFIX = 'dashboard-chat-';
export const YOUTUBE_WATCH_HISTORY_PREFIX = 'dashboard-youtube-seen-';

/**
 * Ends the session (the API revokes it and clears the cookie), and removes the chat histories
 * kept in this browser so the next person cannot read them.
 */
export async function logout() {
    try {
        unwrap(await authClient.signOut());
    } finally {
        Object.keys(localStorage)
            .filter(
                (key) =>
                    key.startsWith(CHAT_HISTORY_PREFIX) ||
                    key.startsWith(YOUTUBE_WATCH_HISTORY_PREFIX),
            )
            .forEach((key) => localStorage.removeItem(key));
    }
}

export async function updateProfile(payload: ProfileFormData): Promise<User> {
    unwrap(await authClient.updateUser(payload));
    return getCurrentUser();
}

/** Email change, step 1: emails a code to the new address. */
export async function requestEmailChange(newEmail: string) {
    unwrap(await authClient.emailOtp.requestEmailChange({ newEmail }));
}

/** Email change, step 2: applies the new address with its code. */
export async function changeEmail(newEmail: string, otp: string): Promise<User> {
    unwrap(await authClient.emailOtp.changeEmail({ newEmail, otp }));
    return getCurrentUser();
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

/**
 * Connects an account of an OAuth provider to a service (e.g. "github-service" for the GitHub
 * service); returns where to send the browser.
 */
export async function getOAuthLinkUrl(provider: string, serviceName: string): Promise<string> {
    const origin = window.location.origin;
    const { url } = unwrap(
        await authClient.linkSocial({
            provider,
            callbackURL: `${origin}/services?linked=${serviceName}`,
            errorCallbackURL: `${origin}/services`,
            disableRedirect: true,
        }),
    );
    return url;
}
