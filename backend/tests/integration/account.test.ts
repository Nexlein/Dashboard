import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.ts';
import prisma from '../../src/utils/prisma.ts';
import { encryptJson } from '../../src/utils/encryption.ts';
import {
    FRONTEND,
    PASSWORD,
    browser,
    fakeGitHub,
    githubFlow,
    githubProfile,
    registerVerified,
    sessionCookie,
    signIn,
    uniqueEmail,
    userByEmail,
} from './helpers.ts';

async function signedIn() {
    const agent = browser();
    const email = await registerVerified(browser());
    const res = await signIn(agent, email);
    const user = await userByEmail(email);
    return { agent, email, user: user!, cookie: sessionCookie(res)!.split(';')[0] };
}

describe('GDPR export', () => {
    it('returns the stored data, readable, without passwords, tokens or credentials', async () => {
        const { agent, user } = await signedIn();
        fakeGitHub(githubProfile());
        await githubFlow(agent, { path: '/api/auth/link-social' });
        await prisma.widgetConfig.create({
            data: {
                userId: user.id,
                serviceName: 'weather',
                widgetName: 'current_weather',
                params: encryptJson({ city: 'Paris' }),
                refreshRate: 60,
                layout: { x: 0, y: 0, w: 2, h: 2 },
            },
        });
        await prisma.serviceConnection.create({
            data: {
                userId: user.id,
                serviceName: 'weather',
                encryptedCredentials: encryptJson({ apiKey: 'private-api-key' }),
                verifiedAt: new Date(),
            },
        });

        const res = await agent.get('/account/export');

        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.body.widgets[0].params).toEqual({ city: 'Paris' });
        expect(res.body.accounts.map((a: { providerId: string }) => a.providerId).sort()).toEqual([
            'credential',
            'github',
        ]);
        expect(res.body.sessions.length).toBeGreaterThan(0);
        const text = JSON.stringify(res.body);
        for (const secret of [
            'password',
            'accessToken',
            'refreshToken',
            'token',
            'private-api-key',
        ])
            expect(text).not.toContain(secret);
    });
});

describe('profile', () => {
    it('updates the display name (trimmed, 50 characters at most)', async () => {
        const { agent, user } = await signedIn();

        const ok = await agent
            .post('/api/auth/update-user')
            .set('Origin', FRONTEND)
            .send({ name: '  Grace ' });
        expect(ok.status).toBe(200);
        expect((await prisma.user.findUnique({ where: { id: user.id } }))!.name).toBe('Grace');

        const tooLong = await agent
            .post('/api/auth/update-user')
            .set('Origin', FRONTEND)
            .send({ name: 'a'.repeat(51) });
        expect(tooLong.status).toBe(400);
        expect(tooLong.body.message).toBe('Display name must be 50 characters or fewer');
        expect(tooLong.body.code).toBe('DISPLAY_NAME_LENGTH');
    });

    it('cannot change the email or the role through update-user', async () => {
        const { agent, user, email } = await signedIn();

        const res = await agent
            .post('/api/auth/update-user')
            .set('Origin', FRONTEND)
            .send({ email: uniqueEmail(), role: 'admin' });

        expect(res.status).toBe(400);
        expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({
            email,
            role: 'user',
        });
    });
});

describe('account deletion', () => {
    it('deletes the account, its data and its sessions', async () => {
        const { agent, user, cookie } = await signedIn();
        await prisma.widgetConfig.create({
            data: {
                userId: user.id,
                serviceName: 'weather',
                widgetName: 'current_weather',
                params: encryptJson({ city: 'Paris' }),
                refreshRate: 60,
                layout: { x: 0, y: 0, w: 2, h: 2 },
            },
        });

        const res = await agent.post('/api/auth/delete-user').set('Origin', FRONTEND).send({});

        expect(res.status).toBe(200);
        expect(sessionCookie(res)).toMatch(/Max-Age=0/);
        expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
        expect(await prisma.widgetConfig.count({ where: { userId: user.id } })).toBe(0);
        expect(await prisma.account.count({ where: { userId: user.id } })).toBe(0);
        expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
        expect((await request(app).get('/widgets').set('Cookie', cookie)).status).toBe(401);
    });

    it('asks for a recent sign-in or the password when the session is old', async () => {
        const { agent, user } = await signedIn();
        await prisma.session.updateMany({
            where: { userId: user.id },
            data: { createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000) },
        });

        const stale = await agent.post('/api/auth/delete-user').set('Origin', FRONTEND).send({});
        expect(stale.status).toBe(400);
        expect(stale.body.code).toBe('SESSION_EXPIRED');
        expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);

        const withPassword = await agent
            .post('/api/auth/delete-user')
            .set('Origin', FRONTEND)
            .send({ password: PASSWORD });
        expect(withPassword.status).toBe(200);
        expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
    });

    it('cannot be triggered from another site', async () => {
        const { agent, user } = await signedIn();

        const res = await agent
            .post('/api/auth/delete-user')
            .set('Origin', 'https://evil.example')
            .send({});

        expect(res.status).toBe(403);
        expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
    });
});

describe('administration (admin plugin)', () => {
    async function adminAgent() {
        const admin = await signedIn();
        await prisma.user.update({ where: { id: admin.user.id }, data: { role: 'admin' } });
        return admin;
    }

    it('is refused to regular users', async () => {
        const { agent } = await signedIn();

        const res = await agent.get('/api/auth/admin/list-users');

        expect(res.status).toBe(403);
    });

    it('lets an administrator list and remove users', async () => {
        const { agent } = await adminAgent();
        const target = await signedIn();

        const list = await agent
            .get('/api/auth/admin/list-users')
            .query({ searchField: 'email', searchValue: target.email });
        expect(list.status).toBe(200);
        expect(list.body.users.map((u: { email: string }) => u.email)).toEqual([target.email]);

        const removed = await agent
            .post('/api/auth/admin/remove-user')
            .set('Origin', FRONTEND)
            .send({ userId: String(target.user.id) });
        expect(removed.status).toBe(200);
        expect(await prisma.user.count({ where: { id: target.user.id } })).toBe(0);
        expect((await request(app).get('/widgets').set('Cookie', target.cookie)).status).toBe(401);
    });

    it('signs a banned user out and keeps them out', async () => {
        const { agent } = await adminAgent();
        const target = await signedIn();

        const ban = await agent
            .post('/api/auth/admin/ban-user')
            .set('Origin', FRONTEND)
            .send({ userId: String(target.user.id) });
        expect(ban.status).toBe(200);

        expect((await request(app).get('/widgets').set('Cookie', target.cookie)).status).toBe(401);
        expect((await signIn(browser(), target.email)).status).toBe(403);
    });

    it('sets the role of another user to user or admin only', async () => {
        const { agent } = await adminAgent();
        const target = await signedIn();
        const setRole = (role: unknown) =>
            agent
                .post('/api/auth/admin/set-role')
                .set('Origin', FRONTEND)
                .send({ userId: String(target.user.id), role });

        expect((await setRole('superuser')).status).toBe(400);
        expect((await setRole(['admin', 'user'])).status).toBe(400);
        expect((await setRole('admin')).status).toBe(200);
        expect(await prisma.user.findUnique({ where: { id: target.user.id } })).toMatchObject({
            role: 'admin',
        });
    });

    it('does not let an administrator change their own role', async () => {
        const { agent, user } = await adminAgent();

        const res = await agent
            .post('/api/auth/admin/set-role')
            .set('Origin', FRONTEND)
            .send({ userId: String(user.id), role: 'user' });

        expect(res.status).toBe(400);
        expect(await prisma.user.findUnique({ where: { id: user.id } })).toMatchObject({
            role: 'admin',
        });
    });

    it('lists banned users and administrators with the filters of the administration page', async () => {
        const { agent } = await adminAgent();
        const banned = await signedIn();
        await agent
            .post('/api/auth/admin/ban-user')
            .set('Origin', FRONTEND)
            .send({ userId: String(banned.user.id) });

        const bannedList = await agent
            .get('/api/auth/admin/list-users')
            .query({ filterField: 'banned', filterValue: true, limit: 100 });
        const admins = await agent
            .get('/api/auth/admin/list-users')
            .query({ filterField: 'role', filterValue: 'admin', limit: 100 });

        const emails = (res: { body: { users: { email: string }[] } }) =>
            res.body.users.map((u) => u.email);
        expect(emails(bannedList)).toContain(banned.email);
        expect(bannedList.body.users.every((u: { banned: boolean }) => u.banned)).toBe(true);
        expect(admins.body.users.every((u: { role: string }) => u.role === 'admin')).toBe(true);
        expect(admins.body.total).toBeGreaterThan(0);
    });

    it('lists an expired ban as lifted, in the filters and counts too', async () => {
        const { agent } = await adminAgent();
        const expired = await signedIn();
        await prisma.user.update({
            where: { id: expired.user.id },
            data: { banned: true, banReason: 'spam', banExpires: new Date('2020-01-01') },
        });

        const banned = await agent
            .get('/api/auth/admin/list-users')
            .query({ filterField: 'banned', filterValue: true, limit: 100 });

        expect(banned.body.users.map((u: { email: string }) => u.email)).not.toContain(
            expired.email,
        );
        expect(await prisma.user.findUnique({ where: { id: expired.user.id } })).toMatchObject({
            banned: false,
            banReason: null,
            banExpires: null,
        });
    });

    it('does not let an administrator remove their own account this way', async () => {
        const { agent, user } = await adminAgent();

        const res = await agent
            .post('/api/auth/admin/remove-user')
            .set('Origin', FRONTEND)
            .send({ userId: String(user.id) });

        expect(res.status).toBe(400);
        expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
    });

    it.each([
        ['post', '/api/auth/admin/impersonate-user'],
        ['post', '/api/auth/admin/stop-impersonating'],
        ['get', '/api/auth/admin/list-user-sessions'],
        ['post', '/api/auth/admin/revoke-user-session'],
        ['post', '/api/auth/admin/set-user-password'],
        ['post', '/api/auth/admin/create-user'],
        ['post', '/api/auth/admin/update-user'],
        ['post', '/api/auth/admin/has-permission'],
    ] as const)('does not offer %s %s, even to administrators', async (method, path) => {
        const { agent } = await adminAgent();
        const target = await signedIn();
        const sessions = await prisma.session.count({ where: { userId: target.user.id } });

        const res = await agent[method](path)
            .set('Origin', FRONTEND)
            .send({ userId: String(target.user.id), password: 'new-password-123' });

        expect(res.status).toBe(404);
        expect(await prisma.session.count({ where: { userId: target.user.id } })).toBe(sessions);
    });
});
