import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi } from '@/test/fixtures';
import { getCurrentUser, login, logout, startGitHubLogin } from './auth';

afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
});

describe('login', () => {
    it('posts the credentials with cookies enabled and keeps nothing in storage', async () => {
        const fetchMock = mockApi({
            'POST /auth/login': { body: { message: 'Login successful' } },
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
        mockApi({ 'POST /auth/login': { status: 401, body: { error: 'Invalid credentials' } } });
        await expect(login({ email: 'ada@example.com', password: 'nope' })).rejects.toThrow(
            'Invalid credentials',
        );
    });
});

describe('session', () => {
    it('reads the current user from the API, sending the session cookie', async () => {
        const fetchMock = mockApi({
            'GET /auth/me': { body: { id: 1, email: 'ada@example.com', displayName: null } },
        });

        await expect(getCurrentUser()).resolves.toMatchObject({ id: 1 });
        expect(fetchMock.mock.calls[0][1]?.credentials).toBe('include');
        expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization');
    });

    it('reports a missing session as an error', async () => {
        mockApi({
            'GET /auth/me': { status: 401, body: { error: 'Missing authentication token' } },
        });
        await expect(getCurrentUser()).rejects.toThrow('Missing authentication token');
    });

    it('asks the API to clear the session cookie on logout', async () => {
        const fetchMock = mockApi({ 'POST /auth/logout': { status: 204 } });
        await logout();
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('removes chat histories from this browser on logout, even if the API fails', async () => {
        localStorage.setItem('dashboard-chat-3', '[{"role":"user","content":"secret"}]');
        localStorage.setItem('cookie-consent', 'declined');
        mockApi({ 'POST /auth/logout': { status: 500, body: { error: 'down' } } });

        await expect(logout()).rejects.toThrow('down');

        expect(localStorage.getItem('dashboard-chat-3')).toBeNull();
        expect(localStorage.getItem('cookie-consent')).toBe('declined');
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
