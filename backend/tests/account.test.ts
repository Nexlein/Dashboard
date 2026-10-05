import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { APIError } from 'better-auth/api';
import { FRONTEND, signedInAs } from './helpers.ts';

const prisma = vi.hoisted(() => ({
    user: { findUnique: vi.fn(), update: vi.fn() },
    account: { findFirst: vi.fn(), findMany: vi.fn() },
    serviceConnection: { findMany: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
    widgetConfig: { findUnique: vi.fn() },
}));
vi.mock('../src/utils/prisma.ts', () => ({ default: prisma }));

import app from '../src/app.ts';
import { auth } from '../src/auth.ts';
import { encryptJson } from '../src/utils/encryption.ts';

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
});

describe('session check on the API routes', () => {
    it('requires a session', async () => {
        expect((await request(app).get('/account/export')).status).toBe(401);
    });

    it('requires an allowed Origin on writes (CSRF), not on reads', async () => {
        signedInAs(1);
        prisma.user.findUnique.mockResolvedValue({ email: 'a@example.com' });
        prisma.user.update.mockResolvedValue({ id: 1, email: 'a@example.com', name: 'A' });

        const write = (origin?: string) => {
            const req = request(app).put('/account/profile');
            return (origin ? req.set('Origin', origin) : req).send({ name: 'A' });
        };
        expect((await write()).status).toBe(403);
        expect((await write('https://evil.example')).status).toBe(403);
        expect((await write(FRONTEND)).status).toBe(200);
        // Swagger UI, served by the API itself.
        expect((await write('http://localhost:8080')).status).toBe(200);
    });
});

describe('GET /account/export', () => {
    beforeEach(() => signedInAs(7));

    it('fails as a whole when stored data cannot be decrypted', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        prisma.user.findUnique.mockResolvedValue({
            id: 7,
            widgets: [{ id: 1, params: { _encrypted: true, iv: 'x', authTag: 'y', data: 'z' } }],
        });

        const res = await request(app).get('/account/export');

        expect(res.status).toBe(500);
        expect(JSON.stringify(res.body)).not.toContain('_encrypted');
    });

    it('returns 404 for a deleted account', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        expect((await request(app).get('/account/export')).status).toBe(404);
    });

    it('selects no password, token or credential', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: 7,
            widgets: [{ id: 1, params: encryptJson({ city: 'Paris' }) }],
        });

        const res = await request(app).get('/account/export');

        expect(res.body.widgets[0].params).toEqual({ city: 'Paris' });
        const { select } = prisma.user.findUnique.mock.calls[0][0];
        expect(select.accounts.select).not.toHaveProperty('password');
        expect(select.accounts.select).not.toHaveProperty('accessToken');
        expect(select.sessions.select).not.toHaveProperty('token');
        expect(select.serviceConnections.select).not.toHaveProperty('encryptedCredentials');
    });
});

describe('PUT /account/profile', () => {
    beforeEach(() => signedInAs(7));
    const put = (body: object) =>
        request(app).put('/account/profile').set('Origin', FRONTEND).send(body);

    it.each([
        [{ name: 'a'.repeat(51) }, 'Display name must be 50 characters or fewer'],
        [{ email: 'not-an-email' }, 'Invalid email address'],
    ])('validates %o', async (body, message) => {
        const res = await put(body);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe(message);
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('reports an email used by another account', async () => {
        prisma.user.findUnique.mockResolvedValue({ email: 'ada@example.com' });
        prisma.user.update.mockRejectedValue(
            Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
        );

        const res = await put({ email: 'grace@example.com' });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Email already taken');
    });

    it('returns 404 for a deleted account', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        expect((await put({ name: 'Ada' })).status).toBe(404);
    });

    it('keeps emailVerified when the email does not change', async () => {
        prisma.user.findUnique.mockResolvedValue({ email: 'ada@example.com' });
        prisma.user.update.mockResolvedValue({ id: 7, email: 'ada@example.com', name: 'Ada' });

        await put({ name: 'Ada', email: 'ADA@example.com' });

        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { name: 'Ada' } }),
        );
    });
});

describe('GitHub as a service', () => {
    beforeEach(() => signedInAs(3));

    it('shows GitHub as not connected without a linked account', async () => {
        prisma.serviceConnection.findMany.mockResolvedValue([]);
        prisma.account.findMany.mockResolvedValue([{ providerId: 'credential' }]);

        const res = await request(app).get('/services');

        const github = res.body.find((s: { name: string }) => s.name === 'github');
        expect(github).toMatchObject({ connected: false, connectionType: 'oauth' });
        expect(auth.api.getAccessToken).not.toHaveBeenCalled();
    });

    it('keeps the listing working when GitHub cannot be reached', async () => {
        prisma.serviceConnection.findMany.mockResolvedValue([]);
        prisma.account.findMany.mockResolvedValue([{ providerId: 'github' }]);
        prisma.account.findFirst.mockResolvedValue({ id: 12 });
        vi.mocked(auth.api.getAccessToken).mockRejectedValue(new Error('refresh failed'));

        const res = await request(app).get('/services');

        expect(res.status).toBe(200);
        expect(res.body.find((s: { name: string }) => s.name === 'github').connected).toBe(true);
    });

    it('answers 204 when GitHub was not linked', async () => {
        prisma.account.findFirst.mockResolvedValue(null);

        const res = await request(app)
            .delete('/services/github/connection')
            .set('Origin', FRONTEND);

        expect(res.status).toBe(204);
        expect(auth.api.unlinkAccount).not.toHaveBeenCalled();
    });

    it('refuses to remove the last sign-in method', async () => {
        prisma.account.findFirst.mockResolvedValue({ id: 12 });
        vi.mocked(auth.api.unlinkAccount).mockRejectedValue(
            APIError.from('BAD_REQUEST', {
                code: 'FAILED_TO_UNLINK_LAST_ACCOUNT',
                message: "You can't unlink your last account",
            }),
        );

        const res = await request(app)
            .delete('/services/github/connection')
            .set('Origin', FRONTEND);

        expect(res.status).toBe(409);
        expect(auth.api.unlinkAccount).toHaveBeenCalledWith(
            expect.objectContaining({ body: { accountId: '12' } }),
        );
    });

    it('reports a GitHub widget as not connected without a linked account', async () => {
        prisma.widgetConfig.findUnique.mockResolvedValue({
            id: 5,
            userId: 3,
            serviceName: 'github',
            widgetName: 'repo_stats',
            params: encryptJson({ owner: 'o', repo: 'r' }),
            refreshRate: 60,
        });
        prisma.account.findFirst.mockResolvedValue(null);

        const res = await request(app).get('/widgets/5/data');

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('GitHub is not connected');
    });
});
