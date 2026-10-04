process.env.JWT_SECRET = 'gdpr-test-secret-with-at-least-32-chars!';
process.env.ENCRYPTION_KEY = 'gdpr-encryption-test-secret-32chars!!';
process.env.GITHUB_CLIENT_ID = 'test-client';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.GITHUB_CALLBACK_URL = 'http://localhost:8080/auth/github/callback';

const request = require('supertest');
const jwt = require('jsonwebtoken');
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => ({
        $transaction: jest.fn(),
        user: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), delete: jest.fn() },
        oAuthToken: { upsert: jest.fn(), findUnique: jest.fn() },
    })),
}));
const { PrismaClient } = require('@prisma/client');
const express = require('express');
const app = express();
app.use(express.json());
app.use('/auth', require('../routes/auth'));
const prisma = PrismaClient.mock.results[0].value;
const { encryptJson, encryptString, decryptString } = require('../utils/encryption');
const authorization = `Bearer ${jwt.sign({ userId: 42 }, process.env.JWT_SECRET)}`;

beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((transaction) => transaction(prisma));
});
afterEach(() => jest.restoreAllMocks());

function tokenFromLocation(location) {
    return new URLSearchParams(new URL(location).hash.slice(1)).get('token');
}

/** The JWT must only travel in the URL fragment, never in the query string. */
function expectTokenInFragment(location) {
    const url = new URL(location);
    expect(url.pathname).toBe('/login/oauth');
    expect(url.search).toBe('');
    expect(tokenFromLocation(location)).toEqual(expect.any(String));
}

describe('Profile and data rights', () => {
    test('requires authentication on all new routes', async () => {
        await request(app).get('/auth/download-data').expect(401);
        await request(app).delete('/auth/delete-account').expect(401);
        await request(app).put('/auth/me').send({}).expect(401);
        expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    test('returns the public profile without selecting password hashes', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: 42,
            email: 'user@example.com',
            displayName: null,
        });
        const res = await request(app)
            .get('/auth/me')
            .set('Authorization', authorization)
            .expect(200);
        expect(res.body).not.toHaveProperty('password');
        expect(prisma.user.findUnique.mock.calls[0][0].select.password).toBeUndefined();
    });

    test('allows an OAuth-only user to change email while retaining the stable identity', async () => {
        prisma.user.findUnique.mockResolvedValue({
            email: 'github@example.com',
            password: null,
            githubId: '142',
        });
        prisma.user.update.mockResolvedValue({ id: 42, email: 'new@example.com' });
        await request(app)
            .put('/auth/me')
            .set('Authorization', authorization)
            .send({ email: 'new@example.com' })
            .expect(200);
        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 42 }, data: { email: 'new@example.com' } }),
        );
        expect(prisma.oAuthToken.findUnique).not.toHaveBeenCalled();
    });

    test('binds an older OAuth account before changing its email', async () => {
        prisma.user.findUnique.mockResolvedValue({
            email: 'github@example.com',
            password: null,
            githubId: null,
        });
        prisma.oAuthToken.findUnique.mockResolvedValue({
            accessToken: encryptString('github-token'),
        });
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ id: 142 }),
        });
        prisma.user.update.mockResolvedValue({ id: 42, email: 'new@example.com' });
        await request(app)
            .put('/auth/me')
            .set('Authorization', authorization)
            .send({ email: 'new@example.com' })
            .expect(200);
        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { email: 'new@example.com', githubId: '142' } }),
        );
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.github.com/user',
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: 'Bearer github-token' }),
            }),
        );
    });

    test('keeps the old email when the legacy GitHub identity cannot be verified', async () => {
        prisma.user.findUnique.mockResolvedValue({ email: 'github@example.com', password: null });
        prisma.oAuthToken.findUnique.mockResolvedValue({ accessToken: encryptString('expired') });
        jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: false,
            json: async () => ({ message: 'Bad credentials' }),
        });
        const res = await request(app)
            .put('/auth/me')
            .set('Authorization', authorization)
            .send({ email: 'new@example.com' })
            .expect(409);
        expect(res.body.error).toMatch(/Reconnect GitHub/);
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    test('still allows OAuth users to update their name with an unchanged email', async () => {
        prisma.user.findUnique.mockResolvedValue({ email: 'github@example.com', password: null });
        prisma.user.update.mockResolvedValue({
            id: 42,
            email: 'github@example.com',
            displayName: 'New name',
        });
        await request(app)
            .put('/auth/me')
            .set('Authorization', authorization)
            .send({ email: ' GitHub@EXAMPLE.COM ', displayName: ' New name ' })
            .expect(200);
        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 42 },
                data: { email: 'github@example.com', displayName: 'New name' },
            }),
        );
    });

    test('allows a password user to change email and reports duplicate emails', async () => {
        prisma.user.findUnique.mockResolvedValue({ email: 'old@example.com', password: 'hash' });
        prisma.oAuthToken.findUnique.mockResolvedValue(null);
        prisma.user.update.mockResolvedValue({
            id: 42,
            email: 'new@example.com',
            displayName: null,
        });
        const res = await request(app)
            .put('/auth/me')
            .set('Authorization', authorization)
            .send({ email: ' NEW@example.com ' })
            .expect(200);
        expect(res.body).toMatchObject({ email: 'new@example.com' });
        prisma.user.update.mockRejectedValue({ code: 'P2002' });
        await request(app)
            .put('/auth/me')
            .set('Authorization', authorization)
            .send({ email: 'taken@example.com' })
            .expect(409);
    });

    test.each([
        { email: '' },
        { email: false },
        { email: 'invalid' },
        { displayName: {} },
        { displayName: 'a'.repeat(51) },
    ])('validates profile input %j', async (body) => {
        await request(app)
            .put('/auth/me')
            .set('Authorization', authorization)
            .send(body)
            .expect(400);
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    test('exports readable widget settings and selects only non-secret account and connection data', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: 42,
            email: 'user@example.com',
            widgets: [
                { id: 1, params: encryptJson({ city: 'Paris' }) },
                { id: 2, params: { city: 'Lyon' } },
            ],
            tokens: [{ provider: 'github' }],
            serviceConnections: [{ serviceName: 'weather' }],
        });
        const res = await request(app)
            .get('/auth/download-data')
            .set('Authorization', authorization)
            .expect(200);
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.body.widgets.map((w) => w.params)).toEqual([
            { city: 'Paris' },
            { city: 'Lyon' },
        ]);
        const query = prisma.user.findUnique.mock.calls[0][0];
        expect(query.where).toEqual({ id: 42 });
        expect(query.select.password).toBeUndefined();
        expect(query.select.tokens.select.accessToken).toBeUndefined();
        expect(query.select.tokens.select.refreshToken).toBeUndefined();
        expect(query.select.serviceConnections.select.encryptedCredentials).toBeUndefined();
    });

    test('fails the whole export when encrypted data is damaged', async () => {
        const params = encryptJson({ city: 'Paris' });
        params.authTag = '0'.repeat(32);
        prisma.user.findUnique.mockResolvedValue({ id: 42, widgets: [{ params }] });
        const res = await request(app)
            .get('/auth/download-data')
            .set('Authorization', authorization)
            .expect(500);
        expect(res.body).toEqual({ error: 'Internal server error' });
    });

    test('returns 404 when exporting a deleted user', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        await request(app)
            .get('/auth/download-data')
            .set('Authorization', authorization)
            .expect(404);
    });

    test('deletes only the authenticated account and reports failures', async () => {
        prisma.user.delete.mockResolvedValue({ id: 42 });
        await request(app)
            .delete('/auth/delete-account')
            .set('Authorization', authorization)
            .send({ userId: 99 })
            .expect(200);
        expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 42 } });
        prisma.user.delete.mockRejectedValue(new Error('database unavailable'));
        await request(app)
            .delete('/auth/delete-account')
            .set('Authorization', authorization)
            .expect(500);
        prisma.user.delete.mockRejectedValue({
            name: 'PrismaClientKnownRequestError',
            code: 'P2025',
        });
        await request(app)
            .delete('/auth/delete-account')
            .set('Authorization', authorization)
            .expect(404);
    });
});

describe('Age confirmation', () => {
    test.each([undefined, false, 'true', 'false', 1])(
        'rejects registration with age confirmation %s',
        async (is16OrOlder) => {
            await request(app)
                .post('/auth/register')
                .send({
                    email: 'new@example.com',
                    password: 'password123',
                    cguAccepted: true,
                    is16OrOlder,
                })
                .expect(400);
            expect(prisma.user.create).not.toHaveBeenCalled();
        },
    );

    async function githubCallback(query = {}, callbackQuery = {}) {
        const start = await request(app).get('/auth/github/login').query(query).expect(302);
        const state = new URL(start.headers.location).searchParams.get('state');
        jest.spyOn(global, 'fetch')
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: 'github-access' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 142, email: 'github@example.com', login: 'user' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ email: 'github@example.com', primary: true, verified: true }],
            });
        return request(app)
            .get('/auth/github/callback')
            .query({ state, code: 'code', ...callbackQuery })
            .set('Cookie', start.headers['set-cookie'][0].split(';')[0]);
    }

    test.each([{}, { cguAccepted: 'true' }, { cguAccepted: 'true', is16OrOlder: 'false' }])(
        'does not create an OAuth account without both declarations %j',
        async (query) => {
            prisma.user.findUnique.mockResolvedValue(null);
            const res = await githubCallback(query, { is16OrOlder: 'true', cguAccepted: 'true' });
            expect(res.status).toBe(302);
            expect(res.headers.location).toContain(
                '/register?error=github_registration_requirements',
            );
            expect(prisma.user.create).not.toHaveBeenCalled();
            expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
        },
    );

    test('creates an OAuth account when both declarations were bound to the starting state', async () => {
        prisma.user.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 42 });
        prisma.user.create.mockResolvedValue({ id: 42 });
        prisma.oAuthToken.upsert.mockResolvedValue({ id: 1 });
        const res = await githubCallback({ cguAccepted: 'true', is16OrOlder: 'true' });
        expectTokenInFragment(res.headers.location);
        expect(prisma.user.create).toHaveBeenCalled();
        expect(decryptString(prisma.oAuthToken.upsert.mock.calls[0][0].create.accessToken)).toBe(
            'github-access',
        );
    });

    test('keeps existing GitHub logins working without repeating registration declarations', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: 42 });
        prisma.oAuthToken.upsert.mockResolvedValue({ id: 1 });
        const res = await githubCallback();
        expectTokenInFragment(res.headers.location);
        expect(prisma.user.create).not.toHaveBeenCalled();
    });
});

describe('GitHub identity after profile changes', () => {
    test('logs into the same account by GitHub ID after changing the Dashboard email', async () => {
        prisma.user.findUnique.mockImplementation(async ({ where }) =>
            where.githubId === '142' || where.id === 42
                ? { id: 42, email: 'changed@example.com', githubId: '142' }
                : null,
        );
        prisma.user.update.mockResolvedValue({ id: 42 });
        prisma.oAuthToken.upsert.mockResolvedValue({ id: 1 });
        const start = await request(app).get('/auth/github/login').expect(302);
        const state = new URL(start.headers.location).searchParams.get('state');
        jest.spyOn(global, 'fetch')
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token' }) })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 142, email: 'original@example.com' }),
            });
        const res = await request(app)
            .get('/auth/github/callback')
            .query({ state, code: 'code' })
            .set('Cookie', start.headers['set-cookie'][0].split(';')[0])
            .expect(302);
        expect(
            jwt.verify(tokenFromLocation(res.headers.location), process.env.JWT_SECRET).userId,
        ).toBe(42);
        expect(prisma.user.create).not.toHaveBeenCalled();
        expect(prisma.user.findUnique).not.toHaveBeenCalledWith({
            where: { email: 'original@example.com' },
        });
    });
});

describe('GitHub identity validation', () => {
    async function loginWithEmails(emails) {
        const start = await request(app)
            .get('/auth/github/login')
            .query({ cguAccepted: 'true', is16OrOlder: 'true' })
            .expect(302);
        const state = new URL(start.headers.location).searchParams.get('state');
        jest.spyOn(global, 'fetch')
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token' }) })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 142, email: 'unverified@example.com' }),
            })
            .mockResolvedValueOnce({ ok: true, json: async () => emails });
        return request(app)
            .get('/auth/github/callback')
            .query({ state, code: 'code' })
            .set('Cookie', start.headers['set-cookie'][0].split(';')[0]);
    }

    test('does not bind a legacy account using an unverified provider email', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        const response = await loginWithEmails([
            { email: 'unverified@example.com', primary: true, verified: false },
        ]);
        expect(response.status).toBe(400);
        expect(prisma.user.create).not.toHaveBeenCalled();
        expect(prisma.user.update).not.toHaveBeenCalled();
        expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
    });

    test('rejects an email already bound to a different GitHub identity', async () => {
        prisma.user.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 42, githubId: '999' });
        const response = await loginWithEmails([
            { email: 'verified@example.com', primary: true, verified: true },
        ]);
        expect(response.status).toBe(409);
        expect(prisma.user.update).not.toHaveBeenCalled();
        expect(prisma.oAuthToken.upsert).not.toHaveBeenCalled();
    });

    test('backfills a legacy account using its verified email without creating another user', async () => {
        prisma.user.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 42, githubId: null })
            .mockResolvedValueOnce({ id: 42 });
        const response = await loginWithEmails([
            { email: 'unverified@example.com', primary: true, verified: false },
            { email: 'verified@example.com', primary: false, verified: true },
        ]);
        expect(response.status).toBe(302);
        expectTokenInFragment(response.headers.location);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { email: 'verified@example.com' },
        });
        expect(prisma.user.create).not.toHaveBeenCalled();
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
});
