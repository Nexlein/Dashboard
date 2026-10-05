import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/test/fixtures';
import { AUTH_TOKEN_KEY } from './apiClient';
import { getCurrentUser, hasValidAuthToken, login, logout, startGitHubLogin } from './auth';

/** An unsigned JWT-shaped token; the frontend only reads the payload. */
function fakeJwt(payload: object) {
    const encode = (value: object) =>
        btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
}
const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
});

describe('hasValidAuthToken', () => {
    it('accepts a token that has not expired', () => {
        localStorage.setItem(AUTH_TOKEN_KEY, fakeJwt({ userId: 1, exp: inOneHour() }));
        expect(hasValidAuthToken()).toBe(true);
    });

    it('rejects an expired token', () => {
        localStorage.setItem(AUTH_TOKEN_KEY, fakeJwt({ userId: 1, exp: 1 }));
        expect(hasValidAuthToken()).toBe(false);
    });

    it('rejects and removes a malformed token', () => {
        localStorage.setItem(AUTH_TOKEN_KEY, 'not-a-jwt');
        expect(hasValidAuthToken()).toBe(false);
        expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    });

    it('decodes base64url payloads (characters atob rejects)', () => {
        // "~~~" encodes to "fn5-" in base64url: the "-" made atob throw before.
        const token = fakeJwt({ note: '~~~', exp: inOneHour() });
        expect(token.split('.')[1]).toMatch(/[-_]/);
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        expect(hasValidAuthToken()).toBe(true);
    });

    it('is false without a token', () => {
        expect(hasValidAuthToken()).toBe(false);
    });
});

describe('login and logout', () => {
    it('stores the token returned by the API and logout removes it', async () => {
        const token = fakeJwt({ userId: 1, exp: inOneHour() });
        const fetchMock = mockApi({ 'POST /auth/login': { body: { message: 'ok', token } } });

        await login({ email: 'ada@example.com', password: 'password1234' });

        expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe(token);
        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
            email: 'ada@example.com',
            password: 'password1234',
        });
        logout();
        expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    });

    it('surfaces the API error and stores nothing on bad credentials', async () => {
        mockApi({ 'POST /auth/login': { status: 401, body: { error: 'Invalid credentials' } } });
        await expect(login({ email: 'ada@example.com', password: 'nope' })).rejects.toThrow(
            'Invalid credentials',
        );
        expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    });
});

describe('getCurrentUser', () => {
    it('does not call the API without a valid token', async () => {
        const fetchMock = mockApi({});
        await expect(getCurrentUser()).rejects.toThrow('Missing authentication token');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends the token as a bearer header', async () => {
        const token = fakeJwt({ userId: 1, exp: inOneHour() });
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        const fetchMock = mockApi({
            'GET /auth/me': { body: { id: 1, email: 'ada@example.com', displayName: null } },
        });

        await expect(getCurrentUser()).resolves.toMatchObject({ id: 1 });
        expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
            Authorization: `Bearer ${token}`,
        });
    });
});

describe('startGitHubLogin', () => {
    it('forwards the registration declarations to the backend', () => {
        const assign = vi.fn();
        vi.stubGlobal('location', { assign });
        startGitHubLogin({ cguAccepted: true, is16OrOlder: true });
        expect(assign).toHaveBeenCalledWith(
            expect.stringMatching(/\/auth\/github\/login\?cguAccepted=true&is16OrOlder=true$/),
        );
    });
});
