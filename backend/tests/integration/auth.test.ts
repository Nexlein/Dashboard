import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { registerSchema } from 'shared';
import app from '../../src/app.ts';
import prisma from '../../src/utils/prisma.ts';
import {
    FRONTEND,
    PASSWORD,
    browser,
    sessionCookie,
    signIn,
    signUp,
    uniqueEmail,
    userByEmail,
} from './helpers.ts';

describe('email sign-up', () => {
    it.each([
        [{ cguAccepted: false }, 'You must accept the CGU to register.'],
        [{ is16OrOlder: undefined }, 'You must confirm you are 16 or older to register.'],
    ])('refuses %o without creating the account', async (body, message) => {
        const email = uniqueEmail();
        const res = await signUp(browser(), { email, ...body });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(message);
        expect(await userByEmail(email)).toBeNull();
    });

    it.each([
        [{ email: 'not-an-email' }, 'Invalid email address'],
        [{ password: 'short' }, 'Password must be between 8 and 128 characters'],
        [{ name: 'a'.repeat(51) }, 'Display name must be 50 characters or fewer'],
    ])('applies the shared registration schema to %o', async (body, message) => {
        const res = await signUp(browser(), body);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(message);
        // Same verdict as the frontend form, which validates with the same schema.
        expect(
            registerSchema.safeParse({ ...body, cguAccepted: true, is16OrOlder: true }).success,
        ).toBe(false);
    });

    it('creates the account, records the CGU acceptance and signs in with an httpOnly cookie', async () => {
        const email = uniqueEmail();
        const res = await signUp(browser(), { email: `  ${email.toUpperCase()} ` });

        expect(res.status).toBe(200);
        const cookie = sessionCookie(res);
        expect(cookie).toMatch(/HttpOnly/);
        expect(cookie).toMatch(/SameSite=Lax/);
        // BETTER_AUTH_URL is http: browsers would drop a Secure cookie.
        expect(cookie).not.toMatch(/Secure/);
        // Page scripts never see the session token.
        expect(res.body.token).toBeUndefined();
        expect(JSON.stringify(res.body)).not.toContain(cookie!.split(';')[0].split('=')[1]);

        const user = await userByEmail(email);
        expect(user).toMatchObject({ email, name: 'Ada', role: 'user', emailVerified: false });
        expect(user!.cguAcceptedAt).toBeInstanceOf(Date);
        const credential = user!.accounts.find((a) => a.providerId === 'credential');
        expect(credential!.password).toBeTruthy();
        expect(credential!.password).not.toContain(PASSWORD);
    });

    it('ignores privileged fields sent by the client', async () => {
        const email = uniqueEmail();
        const res = await signUp(browser(), { email, role: 'admin', cguAcceptedAt: '2000-01-01' });

        expect(res.status).toBe(400);
        expect(await userByEmail(email)).toBeNull();
    });

    it('refuses an email that is already registered', async () => {
        const email = uniqueEmail();
        await signUp(browser(), { email });

        const res = await signUp(browser(), { email });

        expect(res.status).toBe(422);
        expect(res.body.code).toBe('USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL');
    });

    it('refuses a sign-up from a page that is not the frontend', async () => {
        const email = uniqueEmail();
        const res = await browser()
            .post('/api/auth/sign-up/email')
            .set('Origin', 'https://evil.example')
            .send({ email, password: PASSWORD, name: 'x', cguAccepted: true, is16OrOlder: true });

        expect(res.status).toBe(403);
        expect(await userByEmail(email)).toBeNull();
    });
});

describe('email sign-in and sessions', () => {
    async function account() {
        const email = uniqueEmail();
        await signUp(browser(), { email });
        return email;
    }

    it('refuses a wrong password', async () => {
        const res = await signIn(browser(), await account(), 'wrong-password');

        expect(res.status).toBe(401);
        expect(sessionCookie(res)).toBeUndefined();
    });

    it('signs in, and the session never exposes its token', async () => {
        const email = await account();
        const agent = browser();

        const res = await signIn(agent, email);
        expect(res.status).toBe(200);
        expect(res.body.token).toBeUndefined();

        const session = await agent.get('/api/auth/get-session');
        expect(session.body.user.email).toBe(email);
        expect(session.body.session.token).toBeUndefined();
    });

    it('protects the API routes with the session', async () => {
        const email = await account();
        const agent = browser();

        expect((await agent.get('/widgets')).status).toBe(401);
        await signIn(agent, email);
        expect((await agent.get('/widgets')).status).toBe(200);
    });

    it('rejects state-changing requests from other origins (CSRF)', async () => {
        const agent = browser();
        await signIn(agent, await account());

        const layout = { layouts: [] };
        expect(
            (await agent.put('/widgets/layout').set('Origin', 'https://evil.example').send(layout))
                .status,
        ).toBe(403);
        expect((await agent.put('/widgets/layout').send(layout)).status).toBe(403);
        expect(
            (await agent.put('/widgets/layout').set('Origin', FRONTEND).send(layout)).status,
        ).toBe(204);
    });

    it('revokes the session on sign-out: a copied cookie stops working', async () => {
        const agent = browser();
        const res = await signIn(agent, await account());
        const stolen = sessionCookie(res)!.split(';')[0];

        const out = await agent.post('/api/auth/sign-out').set('Origin', FRONTEND).send({});
        expect(out.status).toBe(200);

        expect((await request(app).get('/widgets').set('Cookie', stolen)).status).toBe(401);
    });

    it('refuses a session that has expired', async () => {
        const email = await account();
        const agent = browser();
        await signIn(agent, email);
        const user = await userByEmail(email);
        await prisma.session.updateMany({
            where: { userId: user!.id },
            data: { expiresAt: new Date(Date.now() - 1000) },
        });

        expect((await agent.get('/widgets')).status).toBe(401);
    });
});
