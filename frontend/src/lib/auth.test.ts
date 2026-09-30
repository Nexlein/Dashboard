import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    register,
    login,
    getCurrentUser,
    hasValidAuthToken,
    logout,
    startGitHubLogin,
    API_URL,
} from './auth';

describe('auth lib', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        });
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('register calls API', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'ok' }),
        } as any);

        const res = await register({
            email: 'test',
            password: 'test',
            cguAccepted: true,
            is16OrOlder: true,
        });
        expect(res).toEqual({ message: 'ok' });
    });

    it('login sets local storage', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: 'mytoken' }),
        } as any);

        await login({ email: 'test', password: 'test' });
        expect(localStorage.setItem).toHaveBeenCalledWith('dashboard-auth-token', 'mytoken');
    });

    it('login throws if no token', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        } as any);

        await expect(login({ email: 'test', password: 'test' })).rejects.toThrow();
    });

    it('getCurrentUser fetches user', async () => {
        vi.mocked(localStorage.getItem).mockReturnValue('token');
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ email: 'test' }),
        } as any);

        const res = await getCurrentUser();
        expect(res).toEqual({ email: 'test' });
    });

    it('hasValidAuthToken returns true for valid token', () => {
        const fakeToken = btoa(JSON.stringify({ exp: Date.now() / 1000 + 10000 }));
        vi.mocked(localStorage.getItem).mockReturnValue('header.' + fakeToken + '.sig');

        expect(hasValidAuthToken()).toBe(true);
    });

    it('hasValidAuthToken returns false for expired token', () => {
        const fakeToken = btoa(JSON.stringify({ exp: Date.now() / 1000 - 10000 }));
        vi.mocked(localStorage.getItem).mockReturnValue('header.' + fakeToken + '.sig');

        expect(hasValidAuthToken()).toBe(false);
    });

    it('logout removes token', () => {
        logout();
        expect(localStorage.removeItem).toHaveBeenCalledWith('dashboard-auth-token');
    });

    it('startGitHubLogin redirects to GitHub', () => {
        const assignMock = vi.fn();
        vi.stubGlobal('window', { location: { assign: assignMock } });

        startGitHubLogin({ cguAccepted: true, is16OrOlder: true });
        expect(assignMock).toHaveBeenCalledWith(
            `${API_URL}/auth/github/login?cguAccepted=true&is16OrOlder=true`,
        );
    });
});
