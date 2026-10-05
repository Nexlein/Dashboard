import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/test/fixtures';
import {
    deleteMyAccount,
    getCurrentUser,
    getOAuthLinkUrl,
    login,
    logout,
    register,
    requestPasswordReset,
    resetPassword,
    startGitHubLogin,
    verifyEmailCode,
} from './auth';

afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
});

const SESSION = {
    user: { id: '1', email: 'ada@example.com', name: 'Ada' },
    session: { id: '9', userId: '1' },
};

describe('login', () => {
    it('posts the credentials with cookies enabled and keeps nothing in storage', async () => {
        const fetchMock = mockApi({
            'POST /api/auth/sign-in/email': { body: { redirect: false, user: SESSION.user } },
        });

        await login({ email: 'ada@example.com', password: 'password1234' });

        const [, init] = fetchMock.mock.calls[0];
        expect(init?.credentials).toBe('include');
        expect(JSON.parse(String(init?.body))).toEqual({
            email: 'ada@example.com',
            password: 'password1234',
        });
        expect(localStorage.length).toBe(0);
    });

    it('surfaces the API error on bad credentials', async () => {
        mockApi({
            'POST /api/auth/sign-in/email': {
                status: 401,
                body: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
            },
        });
        await expect(login({ email: 'ada@example.com', password: 'nope' })).rejects.toThrow(
            'Invalid email or password',
        );
    });
});

describe('register', () => {
    it('sends the declarations the API requires', async () => {
        const fetchMock = mockApi({
            'POST /api/auth/sign-up/email': { body: { user: SESSION.user } },
        });

        await register({
            email: 'ada@example.com',
            password: 'password1234',
            name: 'Ada',
            cguAccepted: true,
            is16OrOlder: true,
        });

        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
            name: 'Ada',
            cguAccepted: true,
            is16OrOlder: true,
        });
    });
});

describe('session', () => {
    it('reads the current user from the session, sending the cookie', async () => {
        const fetchMock = mockApi({ 'GET /api/auth/get-session': { body: SESSION } });

        await expect(getCurrentUser()).resolves.toEqual({
            id: 1,
            email: 'ada@example.com',
            name: 'Ada',
        });
        expect(fetchMock.mock.calls[0][1]?.credentials).toBe('include');
    });

    it('reports a missing session as an error', async () => {
        mockApi({ 'GET /api/auth/get-session': { body: null } });
        await expect(getCurrentUser()).rejects.toThrow();
    });

    it('asks the API to revoke the session on logout', async () => {
        const fetchMock = mockApi({ 'POST /api/auth/sign-out': { body: { success: true } } });
        await logout();
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('removes chat histories from this browser on logout, even if the API fails', async () => {
        localStorage.setItem('dashboard-chat-3', '[{"role":"user","content":"secret"}]');
        localStorage.setItem('cookie-consent', 'declined');
        mockApi({ 'POST /api/auth/sign-out': { status: 500, body: { message: 'down' } } });

        await expect(logout()).rejects.toThrow('down');

        expect(localStorage.getItem('dashboard-chat-3')).toBeNull();
        expect(localStorage.getItem('cookie-consent')).toBe('declined');
    });

    it('reports a stale session when deleting the account', async () => {
        mockApi({
            'POST /api/auth/delete-user': {
                status: 400,
                body: { code: 'SESSION_EXPIRED', message: 'Session expired' },
            },
        });
        await expect(deleteMyAccount()).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    });
});

describe('GitHub', () => {
    it('asks for an account creation only with the registration declarations', async () => {
        const assign = vi.fn();
        vi.stubGlobal('location', { assign, origin: 'http://localhost:5173' });
        const fetchMock = mockApi({
            'POST /api/auth/sign-in/social': {
                body: { url: 'https://github.com/login', redirect: false },
            },
        });

        await startGitHubLogin({ cguAccepted: true, is16OrOlder: true });
        await startGitHubLogin();

        const [register, signIn] = fetchMock.mock.calls.map(([, init]) =>
            JSON.parse(String(init?.body)),
        );
        expect(register).toMatchObject({
            provider: 'github',
            requestSignUp: true,
            additionalData: { cguAccepted: true, is16OrOlder: true },
            errorCallbackURL: 'http://localhost:5173/register',
        });
        expect(signIn).not.toHaveProperty('requestSignUp');
        expect(signIn.errorCallbackURL).toBe('http://localhost:5173/login');
        expect(assign).toHaveBeenCalledWith('https://github.com/login');
    });

    it('links GitHub back to the services page', async () => {
        vi.stubGlobal('location', { origin: 'http://localhost:5173' });
        const fetchMock = mockApi({
            'POST /api/auth/link-social': {
                body: { url: 'https://github.com/link', redirect: false },
            },
        });

        await expect(getOAuthLinkUrl('github')).resolves.toBe('https://github.com/link');
        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
            provider: 'github',
            callbackURL: 'http://localhost:5173/services?linked=github',
        });
    });
});

describe('emailed codes', () => {
    it('sends the verification code and the password reset to Better Auth', async () => {
        const fetchMock = mockApi({
            'POST /api/auth/email-otp/verify-email': { body: { status: true, user: SESSION.user } },
            'POST /api/auth/email-otp/request-password-reset': { body: { success: true } },
            'POST /api/auth/email-otp/reset-password': { body: { success: true } },
        });

        await verifyEmailCode('ada@example.com', '123456');
        await requestPasswordReset('ada@example.com');
        await resetPassword('ada@example.com', '654321', 'new-password-123');

        const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
        expect(bodies).toEqual([
            { email: 'ada@example.com', otp: '123456' },
            { email: 'ada@example.com' },
            { email: 'ada@example.com', otp: '654321', password: 'new-password-123' },
        ]);
    });

    it('surfaces a rejected code', async () => {
        mockApi({
            'POST /api/auth/email-otp/verify-email': {
                status: 400,
                body: { code: 'INVALID_OTP', message: 'Invalid OTP' },
            },
        });
        await expect(verifyEmailCode('ada@example.com', '000000')).rejects.toMatchObject({
            message: 'Invalid OTP',
            code: 'INVALID_OTP',
        });
    });
});
