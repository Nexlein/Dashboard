import { describe, it, expect, vi, beforeEach, afterEach, afterAll, type Mock } from 'vitest';
import { signToken, stubFetch } from './helpers.ts';
import request from 'supertest';

// The client the app gets from new PrismaClient(): plain stubs, hoisted for vi.mock.
const prisma = vi.hoisted(() => {
    const client = {
        $transaction: vi.fn((transaction: (tx: unknown) => unknown): unknown =>
            transaction(client),
        ),
        user: { update: vi.fn() },
        oAuthToken: { upsert: vi.fn() },
    };
    return client;
});
vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(function () {
        return prisma;
    }),
}));

const originalEnv = { ...process.env };

import app from '../src/app.ts';
import { decryptString } from '../src/utils/encryption.ts';
// Runs before the imports below: the app reads these when it loads.
vi.hoisted(() => {
    process.env.JWT_SECRET = 'oauth-test-secret-with-at-least-32-chars!';
    process.env.GITHUB_CLIENT_ID = 'test-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
    process.env.GITHUB_CALLBACK_URL = 'http://localhost:8080/auth/github/callback';
});

function authToken(userId = 1) {
    return signToken({ userId }, { expiresIn: '1h' });
}

async function startLink(userId = 1, headers = {}) {
    const response = await request(app)
        .get('/auth/github?format=json')
        .set('Authorization', `Bearer ${authToken(userId)}`)
        .set(headers)
        .expect(200);
    const url = new URL(response.body.authorizationUrl);
    return {
        state: url.searchParams.get('state'),
        cookie: response.headers['set-cookie'][0].split(';')[0],
        response,
    };
}

function callback(
    link: { state: string | null; cookie: string },
    query: Record<string, string> = { code: 'github-code' },
) {
    return request(app)
        .get('/auth/github/callback')
        .query({ state: link.state, ...query })
        .set('Cookie', link.cookie);
}

describe('GitHub account linking', () => {
    let fetchMock: Mock;

    beforeEach(() => {
        prisma.oAuthToken.upsert.mockReset().mockResolvedValue({ id: 1 });
        fetchMock = stubFetch().mockImplementation(async (url: unknown) => ({
            ok: true,
            json: async () =>
                url === 'https://api.github.com/user'
                    ? { id: 142, email: 'github@example.com' }
                    : { access_token: 'github-access-token' },
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    afterAll(() => {
        for (const key of [
            'JWT_SECRET',
            'GITHUB_CLIENT_ID',
            'GITHUB_CLIENT_SECRET',
            'GITHUB_CALLBACK_URL',
        ]) {
            if (originalEnv[key] === undefined) delete process.env[key];
            else process.env[key] = originalEnv[key];
        }
    });

    it('requires a valid Dashboard token to start linking', async () => {
        await request(app).get('/auth/github').expect(401);
        await request(app).get('/auth/github').set('Authorization', 'Bearer invalid').expect(401);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('preserves the redirect and sets a separate, temporary HttpOnly cookie', async () => {
        const response = await request(app)
            .get('/auth/github')
            .set('Authorization', `Bearer ${authToken()}`)
            .expect(302);
        const url = new URL(response.headers.location);
        const state = url.searchParams.get('state');
        const cookie = response.headers['set-cookie'][0];
        const secret = cookie.split(';')[0].split('=')[1];
        expect(url.origin).toBe('https://github.com');
        expect(url.pathname).toBe('/login/oauth/authorize');
        expect(url.searchParams.get('client_id')).toBe('test-client-id');
        expect(url.searchParams.has('client_secret')).toBe(false);
        expect(state).toMatch(/^[a-f0-9]{64}$/);
        expect(secret).not.toBe(state);
        expect(response.headers.location).not.toContain(secret);
        expect(cookie).toContain(`github_link_${state}=`);
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Lax');
        expect(cookie).toContain('Path=/auth/github/callback');
        expect(cookie).toContain('Max-Age=600');
        expect(response.headers['cache-control']).toBe('no-store');
    });

    it('sets Secure on the cookie when the request came over HTTPS', async () => {
        const link = await startLink(1, { 'X-Forwarded-Proto': 'https' });
        expect(link.response.headers['set-cookie'][0]).toContain('Secure');
    });

    it('omits Secure over plain HTTP, even in production, so browsers keep the cookie', async () => {
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            const link = await startLink();
            expect(link.response.headers['set-cookie'][0]).not.toContain('Secure');
        } finally {
            process.env.NODE_ENV = previous;
        }
    });

    it('rejects a callback without its cookie before contacting GitHub or consuming state', async () => {
        const link = await startLink();
        await request(app)
            .get('/auth/github/callback')
            .query({ state: link.state, code: 'github-code' })
            .expect(403);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
        await callback(link).expect(302);
    });

    it('rejects a different browser secret even with a valid state', async () => {
        const first = await startLink(1);
        const second = await startLink(2);
        const wrongCookie = `github_link_${first.state}=${second.cookie.split('=')[1]}`;
        await callback({ ...first, cookie: wrongCookie }).expect(403);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
        await callback(first).expect(302);
        await callback(second).expect(302);
    });

    it('stores the token for the initiating user, clears its cookie and rejects replay', async () => {
        const link = await startLink(42);
        const response = await callback(link).expect(302);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        expect(response.headers.location).toBe(`${frontendUrl}/services?linked=github`);
        expect(response.headers['set-cookie'][0]).toContain(`github_link_${link.state}=;`);
        expect(response.headers['set-cookie'][0]).toContain('Path=/auth/github/callback');
        expect(prisma.oAuthToken.upsert).toHaveBeenCalledWith({
            where: { userId_provider: { userId: 42, provider: 'github' } },
            create: {
                userId: 42,
                provider: 'github',
                accessToken: expect.any(String),
                refreshToken: null,
                expiresAt: null,
            },
            update: { accessToken: expect.any(String), refreshToken: null, expiresAt: null },
        });
        const saved = prisma.oAuthToken.upsert.mock.calls[0][0];
        expect(decryptString(saved.create.accessToken)).toBe('github-access-token');
        expect(saved.create.accessToken).not.toBe('github-access-token');
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe('https://github.com/login/oauth/access_token');
        expect(options.body.get('code')).toBe('github-code');
        await callback(link).expect(400);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(prisma.oAuthToken.upsert).toHaveBeenCalledTimes(1);
    });

    it('supports two pending requests in the same browser', async () => {
        const first = await startLink();
        const second = await startLink();
        const bothCookies = `${first.cookie}; ${second.cookie}`;
        await callback({ ...first, cookie: bothCookies }).expect(302);
        await callback({ ...second, cookie: bothCookies }).expect(302);
        expect(prisma.oAuthToken.upsert).toHaveBeenCalledTimes(2);
    });

    it('rejects missing, malformed and unknown state', async () => {
        for (const query of [
            {},
            { state: 'bad' },
            { state: 'a'.repeat(64) },
            { state: ['a', 'b'] },
        ]) {
            await request(app).get('/auth/github/callback').query(query).expect(400);
        }
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects an expired request even before its cleanup timer runs', async () => {
        const link = await startLink();
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now + 10 * 60 * 1000 + 1);
        const response = await callback(link).expect(400);
        expect(response.body.error).toBe('Unknown or already used state');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('removes abandoned requests automatically after ten minutes', async () => {
        vi.useFakeTimers({ toNotFake: ['nextTick', 'setImmediate'] });
        const link = await startLink();
        vi.advanceTimersByTime(10 * 60 * 1000 + 1);
        const response = await callback(link).expect(400);
        expect(response.body.error).toBe('Unknown or already used state');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('handles refusal and missing code without exchanging or storing tokens', async () => {
        for (const query of [{ error: 'access_denied' }, {}] as Record<string, string>[]) {
            const link = await startLink();
            let res = await callback(link, query).expect(302);
            expect(res.headers.location).toContain('error=');
            await callback(link).expect(400);
        }
        expect(fetchMock).not.toHaveBeenCalled();
        expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
    });

    it('does not save a failed token exchange', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ error: 'bad_verification_code' }),
        });
        const response = await callback(await startLink()).expect(302);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        expect(response.headers.location).toBe(`${frontendUrl}/services?error=github_flow_failed`);
        expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
    });

    it('handles a network failure and database failure without exposing secrets', async () => {
        fetchMock.mockRejectedValueOnce(new Error('private upstream details'));
        let response = await callback(await startLink()).expect(302);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        expect(response.headers.location).toBe(`${frontendUrl}/services?error=github_flow_failed`);
        expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
        prisma.oAuthToken.upsert.mockRejectedValueOnce(new Error('private database details'));
        response = await callback(await startLink()).expect(302);
        expect(response.headers.location).toBe(`${frontendUrl}/services?error=github_flow_failed`);
    });

    describe('GitHub Login Flow (/auth/github/login)', () => {
        it('starts the login flow without needing authorization', async () => {
            const response = await request(app).get('/auth/github/login').expect(302);
            const url = new URL(response.headers.location);
            expect(url.origin).toBe('https://github.com');
            expect(url.pathname).toBe('/login/oauth/authorize');
            expect(url.searchParams.get('client_id')).toBe('test-client-id');
        });
    });
});
