import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setCookies, signToken, verifyToken } from './helpers.ts';
import request, { type Response } from 'supertest';
import bcrypt from 'bcrypt';

// The shared client from utils/prisma.ts: plain stubs, hoisted for vi.mock.
const prisma = vi.hoisted(() => ({
    user: { findUnique: vi.fn(), delete: vi.fn() },
    widgetConfig: { updateMany: vi.fn() },
    $transaction: vi.fn(),
}));
vi.mock('../src/utils/prisma.ts', () => ({ default: prisma }));

import app from '../src/app.ts';
// Runs before the imports below: the app reads these when it loads.
vi.hoisted(() => {
    process.env.JWT_SECRET = 'session-test-secret-with-at-least-32-chars!';
});

const FRONTEND = 'http://localhost:5173';
const user = { id: 7, email: 'ada@example.com', displayName: 'Ada', isAdmin: false };

function sessionCookie(res: Response) {
    return setCookies(res).find((c) => c.startsWith('dashboard_session='));
}

async function login(headers = {}) {
    prisma.user.findUnique.mockResolvedValue({
        ...user,
        password: await bcrypt.hash('password1234', 4),
    });
    const res = await request(app)
        .post('/auth/login')
        .set(headers)
        .send({ email: user.email, password: 'password1234' });
    return { res, cookie: sessionCookie(res)?.split(';')[0] ?? '' };
}

beforeEach(() => vi.clearAllMocks());

describe('session cookie', () => {
    it('is set by login as httpOnly, and the token is not in the response body', async () => {
        const { res } = await login();

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Login successful' });
        const cookie = sessionCookie(res);
        expect(cookie).toMatch(/HttpOnly/);
        expect(cookie).toMatch(/SameSite=Lax/);
        expect(cookie).toMatch(/Path=\//);
        expect(cookie).toMatch(/Expires=/);
        expect(cookie).not.toMatch(/Secure/);
        const token = (cookie ?? '').split(';')[0].split('=')[1];
        expect(verifyToken(token)).toMatchObject({ userId: 7 });
    });

    it('is marked Secure when the request came over HTTPS (behind the proxy)', async () => {
        const { res } = await login({ 'X-Forwarded-Proto': 'https' });
        expect(sessionCookie(res)).toMatch(/Secure/);
    });

    it('is not marked Secure over plain HTTP, even in production', async () => {
        // Browsers drop Secure cookies received over HTTP (localhost excepted): a deployment
        // served over plain HTTP would make every login fail.
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            const { res } = await login();
            expect(sessionCookie(res)).not.toMatch(/Secure/);
        } finally {
            process.env.NODE_ENV = previous;
        }
    });

    it('authenticates requests', async () => {
        const { cookie } = await login();
        prisma.user.findUnique.mockResolvedValue({
            id: 7,
            email: user.email,
            displayName: 'Ada',
        });

        const res = await request(app).get('/auth/me').set('Cookie', cookie);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 7, email: user.email });
    });

    it('is cleared by logout', async () => {
        const res = await request(app).post('/auth/logout');

        expect(res.status).toBe(204);
        expect(sessionCookie(res)).toMatch(/dashboard_session=;.*Expires=Thu, 01 Jan 1970/);
    });

    it('is cleared when the account is deleted', async () => {
        const { cookie } = await login();
        prisma.user.delete.mockResolvedValue({ id: 7 });

        const res = await request(app)
            .delete('/auth/delete-account')
            .set('Cookie', cookie)
            .set('Origin', FRONTEND);

        expect(res.status).toBe(200);
        expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    });
});

describe('CSRF protection for cookie-authenticated writes', () => {
    const saveLayout = (cookie: string) =>
        request(app).put('/widgets/layout').set('Cookie', cookie).send({ layouts: [] });

    it.each([
        ['no Origin header', undefined],
        ['another site', 'https://evil.example'],
    ])('rejects a write from %s', async (_label, origin) => {
        const { cookie } = await login();
        const req = saveLayout(cookie);
        if (origin) req.set('Origin', origin);

        const res = await req;

        expect(res.status).toBe(403);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('accepts a write from the frontend origin', async () => {
        const { cookie } = await login();
        prisma.$transaction.mockResolvedValue([]);

        const res = await saveLayout(cookie).set('Origin', FRONTEND);

        expect(res.status).toBe(204);
    });

    it('does not apply to reads', async () => {
        const { cookie } = await login();
        prisma.user.findUnique.mockResolvedValue({ id: 7, email: user.email, displayName: null });

        const res = await request(app).get('/auth/me').set('Cookie', cookie);

        expect(res.status).toBe(200);
    });

    it('does not apply to Bearer requests, which browsers never send on their own', async () => {
        prisma.$transaction.mockResolvedValue([]);
        const token = signToken({ userId: 7, isAdmin: false });

        const res = await request(app)
            .put('/widgets/layout')
            .set('Authorization', `Bearer ${token}`)
            .send({ layouts: [] });

        expect(res.status).toBe(204);
    });
});
