import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { FRONTEND, signedInAs, stubFetch } from './helpers.ts';

const prisma = vi.hoisted(() => ({
    user: { findUnique: vi.fn() },
    account: { findMany: vi.fn() },
    serviceConnection: { findMany: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
    widgetConfig: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
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
        prisma.serviceConnection.deleteMany.mockResolvedValue({ count: 0 });

        const write = (origin?: string) => {
            const req = request(app).delete('/services/weather/connection');
            return origin ? req.set('Origin', origin) : req;
        };
        expect((await write()).status).toBe(403);
        expect((await write('https://evil.example')).status).toBe(403);
        expect((await write(FRONTEND)).status).toBe(204);
        // Swagger UI, served by the API itself.
        expect((await write('http://localhost:8080')).status).toBe(204);
        expect((await request(app).get('/widgets')).status).not.toBe(403);
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

describe('GitHub as a service', () => {
    beforeEach(() => signedInAs(3));
    const githubOf = (res: { body: { name: string }[] }) =>
        res.body.find((s) => s.name === 'github') as Record<string, unknown>;

    it('shows GitHub as not connected without a connected account', async () => {
        prisma.serviceConnection.findMany.mockResolvedValue([]);
        prisma.account.findMany.mockResolvedValue([]);

        const res = await request(app).get('/services');

        expect(githubOf(res)).toMatchObject({
            connected: false,
            connectionType: 'oauth',
            accounts: [],
        });
        expect(prisma.account.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 3, providerId: 'github-service' } }),
        );
        expect(auth.api.getAccessToken).not.toHaveBeenCalled();
    });

    it('lists each connected account by its GitHub login, without its token', async () => {
        prisma.serviceConnection.findMany.mockResolvedValue([]);
        prisma.account.findMany.mockResolvedValue([{ id: 12, accountId: '1' }]);
        vi.mocked(auth.api.getAccessToken).mockResolvedValue({
            accessToken: 'gho_secret',
        } as never);
        stubFetch().mockResolvedValue(
            Response.json({ login: 'octocat', avatar_url: 'https://avatars/1' }),
        );

        const res = await request(app).get('/services');

        expect(githubOf(res)).toMatchObject({
            connected: true,
            accounts: [{ id: 12, login: 'octocat', avatarUrl: 'https://avatars/1' }],
        });
        expect(JSON.stringify(res.body)).not.toContain('gho_secret');
    });

    it('keeps listing an account whose token GitHub revoked, so it can be removed', async () => {
        prisma.serviceConnection.findMany.mockResolvedValue([]);
        prisma.account.findMany.mockResolvedValue([{ id: 12, accountId: '1' }]);
        vi.mocked(auth.api.getAccessToken).mockRejectedValue(new Error('refresh failed'));

        const res = await request(app).get('/services');

        expect(res.status).toBe(200);
        expect(githubOf(res)).toMatchObject({
            connected: true,
            accounts: [{ id: 12, login: null, avatarUrl: null }],
        });
    });

    it('removes one connected account, and only an account of this user', async () => {
        prisma.account.findMany.mockResolvedValue([{ id: 12, accountId: '1' }]);

        const unknown = await request(app)
            .delete('/services/github/accounts/99')
            .set('Origin', FRONTEND);
        const known = await request(app)
            .delete('/services/github/accounts/12')
            .set('Origin', FRONTEND);

        expect(unknown.status).toBe(404);
        expect(known.status).toBe(204);
        expect(auth.api.unlinkAccount).toHaveBeenCalledTimes(1);
        expect(auth.api.unlinkAccount).toHaveBeenCalledWith(
            expect.objectContaining({ body: { accountId: '12' } }),
        );
    });

    it('removes every connected account at once', async () => {
        prisma.account.findMany.mockResolvedValue([
            { id: 12, accountId: '1' },
            { id: 13, accountId: '2' },
        ]);

        const res = await request(app)
            .delete('/services/github/connection')
            .set('Origin', FRONTEND);

        expect(res.status).toBe(204);
        expect(vi.mocked(auth.api.unlinkAccount).mock.calls.map(([arg]) => arg?.body)).toEqual([
            { accountId: '12' },
            { accountId: '13' },
        ]);
    });

    function githubWidget(params: Record<string, unknown>) {
        prisma.widgetConfig.findUnique.mockResolvedValue({
            id: 5,
            userId: 3,
            serviceName: 'github',
            widgetName: 'repo_stats',
            params: encryptJson({ owner: 'o', repo: 'r', ...params }),
            refreshRate: 60,
        });
    }

    it('reports a GitHub widget as not connected without a connected account', async () => {
        githubWidget({});
        prisma.account.findMany.mockResolvedValue([]);

        const res = await request(app).get('/widgets/5/data');

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('GitHub is not connected');
    });

    it('asks to reconnect an account GitHub no longer accepts', async () => {
        githubWidget({ account: '12' });
        prisma.account.findMany.mockResolvedValue([{ id: 12, accountId: '1' }]);
        vi.mocked(auth.api.getAccessToken).mockRejectedValue(new Error('refresh failed'));

        const res = await request(app).get('/widgets/5/data');

        expect(res.status).toBe(502);
        expect(res.body.error).toBe(
            'This GitHub account no longer works: reconnect it in Services',
        );
    });
});
