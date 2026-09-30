const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('@prisma/client', () => {
    const mockPrisma = {
        $transaction: jest.fn((transaction) => transaction(mockPrisma)),
        user: { update: jest.fn() },
        oAuthToken: {
            upsert: jest.fn(),
        },
    };

    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

const app = require('../index');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { decrypt } = require('../utils/crypto');

function authToken(userId = 1) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function startLink(userId = 1) {
    const response = await request(app)
        .get('/auth/github?format=json')
        .set('Authorization', `Bearer ${authToken(userId)}`)
        .expect(200);
    const url = new URL(response.body.authorizationUrl);
    return {
        state: url.searchParams.get('state'),
        cookie: response.headers['set-cookie'][0].split(';')[0],
        response,
    };
}

function callback(link, query = { code: 'github-code' }) {
    return request(app)
        .get('/auth/github/callback')
        .query({ state: link.state, ...query })
        .set('Cookie', link.cookie);
}

describe('GitHub account linking', () => {
    beforeEach(() => {
        prisma.oAuthToken.upsert.mockReset().mockResolvedValue({ id: 1 });
        jest.spyOn(global, 'fetch').mockImplementation(async (url) => ({
            ok: true,
            json: async () =>
                url === 'https://api.github.com/user'
                    ? { id: 142, email: 'github@example.com' }
                    : { access_token: 'github-access-token' },
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('requires a valid Dashboard token to start linking', async () => {
        await request(app).get('/auth/github').expect(401);
        await request(app).get('/auth/github').set('Authorization', 'Bearer invalid').expect(401);
        expect(global.fetch).not.toHaveBeenCalled();
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

    it('sets Secure on the cookie in production', async () => {
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            const link = await startLink();
            expect(link.response.headers['set-cookie'][0]).toContain('Secure');
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
        expect(global.fetch).not.toHaveBeenCalled();
        expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
        await callback(link).expect(302);
    });

    it('rejects a different browser secret even with a valid state', async () => {
        const first = await startLink(1);
        const second = await startLink(2);
        const wrongCookie = `github_link_${first.state}=${second.cookie.split('=')[1]}`;
        await callback({ ...first, cookie: wrongCookie }).expect(403);
        expect(global.fetch).not.toHaveBeenCalled();
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
        expect(decrypt(saved.create.accessToken)).toBe('github-access-token');
        expect(saved.create.accessToken).not.toBe('github-access-token');
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('https://github.com/login/oauth/access_token');
        expect(options.body.get('code')).toBe('github-code');
        await callback(link).expect(400);
        expect(global.fetch).toHaveBeenCalledTimes(2);
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
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects an expired request even before its cleanup timer runs', async () => {
        const link = await startLink();
        const now = Date.now();
        jest.spyOn(Date, 'now').mockReturnValue(now + 10 * 60 * 1000 + 1);
        const response = await callback(link).expect(400);
        expect(response.body.error).toBe('Unknown or already used state');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('removes abandoned requests automatically after ten minutes', async () => {
        jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
        const link = await startLink();
        jest.advanceTimersByTime(10 * 60 * 1000 + 1);
        const response = await callback(link).expect(400);
        expect(response.body.error).toBe('Unknown or already used state');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles refusal and missing code without exchanging or storing tokens', async () => {
        for (const query of [{ error: 'access_denied' }, {}]) {
            const link = await startLink();
            let res = await callback(link, query).expect(302);
            expect(res.headers.location).toContain('error=');
            await callback(link).expect(400);
        }
        expect(global.fetch).not.toHaveBeenCalled();
        expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
    });

    it('does not save a failed token exchange', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ error: 'bad_verification_code' }),
        });
        const response = await callback(await startLink()).expect(302);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        expect(response.headers.location).toBe(`${frontendUrl}/services?error=github_flow_failed`);
        expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
    });

    it('handles a network failure and database failure without exposing secrets', async () => {
        global.fetch.mockRejectedValueOnce(new Error('private upstream details'));
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
