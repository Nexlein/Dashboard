import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { registerSchema } from 'shared';
import app from '../../src/app.ts';
import prisma from '../../src/utils/prisma.ts';
import {
    FRONTEND,
    PASSWORD,
    browser,
    lastCode,
    mailsTo,
    registerVerified,
    sessionCookie,
    signIn,
    signUp,
    uniqueEmail,
    userByEmail,
    verifyEmail,
} from './helpers.ts';

describe('email sign-up', () => {
    it.each([
        [{ cguAccepted: false }, 'You must accept the CGU to register.', 'TERMS_REQUIRED'],
        [
            { is16OrOlder: undefined },
            'You must confirm you are 16 or older to register.',
            'AGE_REQUIRED',
        ],
    ])('refuses %o without creating the account', async (body, message, code) => {
        const email = uniqueEmail();
        const res = await signUp(browser(), { email, ...body });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(message);
        expect(res.body.code).toBe(code);
        expect(await userByEmail(email)).toBeNull();
    });

    it.each([
        [{ email: 'not-an-email' }, 'Invalid email address', 'INVALID_EMAIL'],
        [{ password: 'short' }, 'Password must be between 8 and 128 characters', 'PASSWORD_LENGTH'],
        [
            { name: 'a'.repeat(51) },
            'Display name must be 50 characters or fewer',
            'DISPLAY_NAME_LENGTH',
        ],
    ])('applies the shared registration schema to %o', async (body, message, code) => {
        const res = await signUp(browser(), body);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(message);
        expect(res.body.code).toBe(code);
        // Same verdict as the frontend form, which validates with the same schema.
        expect(
            registerSchema.safeParse({ ...body, cguAccepted: true, is16OrOlder: true }).success,
        ).toBe(false);
    });

    it('creates the account, records the CGU acceptance and emails a code instead of signing in', async () => {
        const email = uniqueEmail();
        const res = await signUp(browser(), { email: `  ${email.toUpperCase()} ` });

        expect(res.status).toBe(200);
        expect(sessionCookie(res)).toBeUndefined();
        expect(mailsTo(email)).toHaveLength(1);
        expect(mailsTo(email)[0].subject).toContain('code de vérification');

        const user = await userByEmail(email);
        expect(user).toMatchObject({ email, name: 'Ada', role: 'user', emailVerified: false });
        expect(user!.cguAcceptedAt).toBeInstanceOf(Date);
        const credential = user!.accounts.find((a) => a.providerId === 'credential');
        expect(credential!.password).toBeTruthy();
        expect(credential!.password).not.toContain(PASSWORD);
    });

    it('signs in with an httpOnly cookie once the emailed code is entered', async () => {
        const email = uniqueEmail();
        await signUp(browser(), { email });

        const res = await verifyEmail(browser(), email);

        expect(res.status).toBe(200);
        expect((await userByEmail(email))!.emailVerified).toBe(true);
        const cookie = sessionCookie(res);
        expect(cookie).toMatch(/HttpOnly/);
        expect(cookie).toMatch(/SameSite=Lax/);
        // BETTER_AUTH_URL is http: browsers would drop a Secure cookie.
        expect(cookie).not.toMatch(/Secure/);
        // Page scripts never see the session token.
        expect(res.body.token).toBeUndefined();
        expect(JSON.stringify(res.body)).not.toContain(cookie!.split(';')[0].split('=')[1]);
    });

    it('ignores privileged fields sent by the client', async () => {
        const email = uniqueEmail();
        const res = await signUp(browser(), { email, role: 'admin', cguAcceptedAt: '2000-01-01' });

        expect(res.status).toBe(400);
        expect(await userByEmail(email)).toBeNull();
    });

    it('does not reveal whether an email is registered, and keeps the existing account', async () => {
        const email = await registerVerified(browser());

        const res = await signUp(browser(), { email, password: 'another-password-123' });

        // Same answer as for a new address: sign-up cannot be used to list accounts.
        expect(res.status).toBe(200);
        expect(await prisma.user.count({ where: { email } })).toBe(1);
        expect((await signIn(browser(), email)).status).toBe(200);
        expect((await signIn(browser(), email, 'another-password-123')).status).toBe(401);
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
    function account() {
        return registerVerified(browser());
    }

    it('refuses to sign in before the email is verified, and sends a new code', async () => {
        const email = uniqueEmail();
        await signUp(browser(), { email });
        const firstCode = lastCode(email);

        const res = await signIn(browser(), email);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
        expect(sessionCookie(res)).toBeUndefined();
        expect(mailsTo(email)).toHaveLength(2);
        expect(lastCode(email)).not.toBe(firstCode);
    });

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
