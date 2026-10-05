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
    sessionCookie,
    signIn,
    signUp,
    uniqueEmail,
    userByEmail,
} from './helpers.ts';

async function signedIn() {
    const agent = browser();
    const email = uniqueEmail();
    await signUp(agent, { email });
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
    it('updates the name and the email, which then needs verifying again', async () => {
        const { agent, user } = await signedIn();
        const email = uniqueEmail();

        const res = await agent
            .put('/account/profile')
            .set('Origin', FRONTEND)
            .send({ name: '  Grace ', email: ` ${email.toUpperCase()}` });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: user.id, email, name: 'Grace' });
        expect((await userByEmail(email))!.emailVerified).toBe(false);
    });

    it('refuses an email used by another account', async () => {
        const { agent } = await signedIn();
        const other = await signedIn();

        const res = await agent
            .put('/account/profile')
            .set('Origin', FRONTEND)
            .send({ email: other.email });

        expect(res.status).toBe(409);
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

    it('does not let an administrator remove their own account this way', async () => {
        const { agent, user } = await adminAgent();

        const res = await agent
            .post('/api/auth/admin/remove-user')
            .set('Origin', FRONTEND)
            .send({ userId: String(user.id) });

        expect(res.status).toBe(400);
        expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
    });

    it('no longer serves the old /admin routes', async () => {
        const { agent } = await adminAgent();

        expect((await agent.get('/admin/users')).status).toBe(404);
    });
});
