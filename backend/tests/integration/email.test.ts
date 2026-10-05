import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.ts';
import prisma from '../../src/utils/prisma.ts';
import {
    FRONTEND,
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

/** A code that differs from `code`. */
const wrong = (code: string) => (code === '000000' ? '111111' : '000000');

describe('email verification codes', () => {
    it('refuses a wrong code, and invalidates the code after 3 wrong attempts', async () => {
        const email = uniqueEmail();
        await signUp(browser(), { email });
        const code = lastCode(email);

        for (let attempt = 0; attempt < 3; attempt += 1) {
            const res = await verifyEmail(browser(), email, wrong(code));
            expect(res.status).toBe(400);
        }
        const tooLate = await verifyEmail(browser(), email, code);

        expect(tooLate.status).toBe(403);
        expect(sessionCookie(tooLate)).toBeUndefined();
        expect((await userByEmail(email))!.emailVerified).toBe(false);
    });

    it('refuses an expired code', async () => {
        const email = uniqueEmail();
        await signUp(browser(), { email });
        await prisma.verification.updateMany({
            where: { identifier: { contains: email } },
            data: { expiresAt: new Date(Date.now() - 1000) },
        });

        const res = await verifyEmail(browser(), email);

        expect(res.status).toBe(400);
        expect((await userByEmail(email))!.emailVerified).toBe(false);
    });

    it('stores codes hashed, never as sent', async () => {
        const email = uniqueEmail();
        await signUp(browser(), { email });

        const rows = await prisma.verification.findMany({
            where: { identifier: { contains: email } },
        });

        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) expect(row.value).not.toContain(lastCode(email));
    });

    it('can send a new code on request', async () => {
        const email = uniqueEmail();
        await signUp(browser(), { email });

        const res = await browser()
            .post('/api/auth/email-otp/send-verification-otp')
            .set('Origin', FRONTEND)
            .send({ email, type: 'email-verification' });

        expect(res.status).toBe(200);
        expect(mailsTo(email)).toHaveLength(2);
        expect((await verifyEmail(browser(), email)).status).toBe(200);
    });

    it('does not offer sign-in by code', async () => {
        const email = await registerVerified(browser());
        const before = mailsTo(email).length;

        const send = await browser()
            .post('/api/auth/email-otp/send-verification-otp')
            .set('Origin', FRONTEND)
            .send({ email, type: 'sign-in' });
        const signInByCode = await browser()
            .post('/api/auth/sign-in/email-otp')
            .set('Origin', FRONTEND)
            .send({ email, otp: '123456' });

        expect(send.status).toBe(400);
        expect(mailsTo(email)).toHaveLength(before);
        expect(signInByCode.status).toBe(404);
    });
});

describe('forgotten password', () => {
    function requestReset(email: string) {
        return browser()
            .post('/api/auth/email-otp/request-password-reset')
            .set('Origin', FRONTEND)
            .send({ email });
    }

    function reset(email: string, otp: string, password: string) {
        return browser()
            .post('/api/auth/email-otp/reset-password')
            .set('Origin', FRONTEND)
            .send({ email, otp, password });
    }

    it('answers the same for unknown addresses, without sending anything', async () => {
        const email = uniqueEmail();

        const res = await requestReset(email);

        expect(res.status).toBe(200);
        expect(mailsTo(email)).toHaveLength(0);
    });

    it('sets a new password with the emailed code and signs every session out', async () => {
        const email = await registerVerified(browser());
        const agent = browser();
        const cookie = sessionCookie(await signIn(agent, email))!.split(';')[0];

        expect((await requestReset(email)).status).toBe(200);
        expect(mailsTo(email).at(-1)!.subject).toContain('mot de passe');
        const res = await reset(email, lastCode(email), 'a-brand-new-password');

        expect(res.status).toBe(200);
        expect((await request(app).get('/widgets').set('Cookie', cookie)).status).toBe(401);
        expect((await signIn(browser(), email)).status).toBe(401);
        expect((await signIn(browser(), email, 'a-brand-new-password')).status).toBe(200);
    });

    it('refuses a wrong code and a too short password', async () => {
        const email = await registerVerified(browser());
        await requestReset(email);
        const code = lastCode(email);

        expect((await reset(email, wrong(code), 'a-brand-new-password')).status).toBe(400);
        expect((await reset(email, code, 'short')).status).toBe(400);
        expect((await signIn(browser(), email)).status).toBe(200);
    });

    it('lets the owner of an address take back an account someone else registered with it', async () => {
        // An account created with this address but never verified...
        const email = uniqueEmail();
        await signUp(browser(), { email, password: 'squatter-password' });

        // ...is recovered by whoever receives the codes.
        await requestReset(email);
        expect((await reset(email, lastCode(email), 'owner-password-123')).status).toBe(200);

        expect((await userByEmail(email))!.emailVerified).toBe(true);
        expect((await signIn(browser(), email, 'squatter-password')).status).toBe(401);
        expect((await signIn(browser(), email, 'owner-password-123')).status).toBe(200);
    });
});

describe('email change', () => {
    async function signedIn() {
        const agent = browser();
        const email = await registerVerified(agent);
        return { agent, email };
    }

    it('applies the new address once the code sent to it is entered', async () => {
        const { agent, email } = await signedIn();
        const newEmail = uniqueEmail();

        const request = await agent
            .post('/api/auth/email-otp/request-email-change')
            .set('Origin', FRONTEND)
            .send({ newEmail });
        expect(request.status).toBe(200);
        expect(await userByEmail(email)).not.toBeNull();

        const change = await agent
            .post('/api/auth/email-otp/change-email')
            .set('Origin', FRONTEND)
            .send({ newEmail, otp: lastCode(newEmail) });

        expect(change.status).toBe(200);
        expect(await userByEmail(email)).toBeNull();
        expect(await userByEmail(newEmail)).toMatchObject({ emailVerified: true });
        expect((await signIn(browser(), newEmail)).status).toBe(200);
    });

    it('does not reveal or take an address used by another account', async () => {
        const { agent } = await signedIn();
        const taken = await registerVerified(browser());
        const before = mailsTo(taken).length;

        const res = await agent
            .post('/api/auth/email-otp/request-email-change')
            .set('Origin', FRONTEND)
            .send({ newEmail: taken });

        expect(res.status).toBe(200);
        expect(mailsTo(taken)).toHaveLength(before);
    });

    it('needs a signed-in session', async () => {
        const res = await browser()
            .post('/api/auth/email-otp/request-email-change')
            .set('Origin', FRONTEND)
            .send({ newEmail: uniqueEmail() });

        expect(res.status).toBe(401);
    });
});

describe('codes and other sites', () => {
    it('lets no other site send the JSON requests that check a code (CORS preflight)', async () => {
        const preflight = await request(app)
            .options('/api/auth/email-otp/verify-email')
            .set('Origin', 'https://evil.example')
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'content-type');

        expect(preflight.headers['access-control-allow-origin']).toBeUndefined();

        const allowed = await request(app)
            .options('/api/auth/email-otp/verify-email')
            .set('Origin', FRONTEND)
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'content-type');
        expect(allowed.headers['access-control-allow-origin']).toBe(FRONTEND);
    });
});
