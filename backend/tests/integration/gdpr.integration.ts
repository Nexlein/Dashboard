// Run against a disposable PostgreSQL database, never a development/production DB.
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID, randomInt } from 'node:crypto';
import net from 'node:net';

if (!process.env.TEST_DATABASE_URL)
    throw new Error('TEST_DATABASE_URL must point to an isolated test database');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const JWT_SECRET = 'gdpr-integration-jwt-secret-at-least-32-chars-long';
process.env.JWT_SECRET = JWT_SECRET;
process.env.ENCRYPTION_KEY = 'gdpr-integration-encryption-secret-that-is-at-least-32-bytes';
delete process.env.REDIS_URL;
process.env.GITHUB_CLIENT_ID = 'integration-client';
process.env.GITHUB_CLIENT_SECRET = 'integration-client-secret';
process.env.GITHUB_CALLBACK_URL = 'http://localhost/auth/github/callback';
process.env.TEST_GITHUB_ID = String(randomInt(1000000, 1000000000));
process.env.TEST_GITHUB_EMAIL = `${randomUUID()}@integration.test`;
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.ts';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { encryptJson, encryptString, decryptString } from '../../src/utils/encryption.ts';
const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }),
});
let child: ChildProcess | undefined;
const ids: number[] = [];

async function main() {
    const user = await prisma.user.create({
        data: {
            email: `${randomUUID()}@integration.test`,
            password: 'password-hash',
            displayName: 'Integration',
            widgets: {
                create: {
                    serviceName: 'weather',
                    widgetName: 'current_weather',
                    params: encryptJson({ city: 'Paris' }),
                    refreshRate: 60,
                    layout: { x: 0, y: 0, w: 3, h: 2 },
                },
            },
            tokens: {
                create: {
                    provider: 'github',
                    accessToken: encryptString('stored-access'),
                    refreshToken: encryptString('stored-refresh'),
                },
            },
            serviceConnections: {
                create: {
                    serviceName: 'weather',
                    encryptedCredentials: encryptJson({ apiKey: 'private-api-key' }),
                    verifiedAt: new Date(),
                },
            },
        },
    });
    ids.push(user.id);
    const other = await prisma.user.create({
        data: { email: `${randomUUID()}@integration.test`, password: null, githubId: randomUUID() },
    });
    ids.push(other.id);

    const port = await new Promise<number>((resolve) => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            assert.ok(address && typeof address === 'object');
            const port = address.port;
            server.close(() => resolve(port));
        });
    });
    const app = spawn(
        process.execPath,
        ['--require', path.join(import.meta.dirname, 'github.fixture.cjs'), 'src/server.ts'],
        {
            cwd: path.join(import.meta.dirname, '../..'),
            env: { ...process.env, PORT: String(port) },
            stdio: ['ignore', 'pipe', 'inherit'],
        },
    );
    child = app;
    await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Server did not start')), 15000);
        app.stdout.on('data', (chunk: Buffer) => {
            if (String(chunk).includes('Server running on port')) {
                clearTimeout(timer);
                resolve();
            }
        });
        app.once('exit', () => {
            clearTimeout(timer);
            reject(new Error('Server exited before startup completed'));
        });
        app.once('error', reject);
    });
    const stored = await prisma.oAuthToken.findUnique({
        where: { userId_provider: { userId: user.id, provider: 'github' } },
    });
    assert.ok(stored?.refreshToken);
    assert.equal(decryptString(stored.accessToken), 'stored-access');
    assert.equal(decryptString(stored.refreshToken), 'stored-refresh');

    const base = `http://127.0.0.1:${port}`;
    const headers = {
        Authorization: `Bearer ${jwt.sign({ userId: user.id }, JWT_SECRET)}`,
    };
    const response = await fetch(`${base}/auth/download-data`, { headers });
    assert.equal(response.status, 200);
    const exported = (await response.json()) as {
        password?: unknown;
        widgets: { params: unknown }[];
        tokens: Record<string, unknown>[];
        serviceConnections: Record<string, unknown>[];
    };
    assert.deepEqual(exported.widgets[0].params, { city: 'Paris' });
    assert.equal(exported.password, undefined);
    assert.equal(exported.tokens[0].accessToken, undefined);
    assert.equal(exported.serviceConnections[0].encryptedCredentials, undefined);
    assert.equal(exported.tokens[0].provider, 'github');
    assert.equal((await fetch(`${base}/auth/download-data`)).status, 401);

    const oauthHeaders = {
        Authorization: `Bearer ${jwt.sign({ userId: other.id }, JWT_SECRET)}`,
        'Content-Type': 'application/json',
    };
    assert.equal(
        (
            await fetch(`${base}/auth/me`, {
                method: 'PUT',
                headers: oauthHeaders,
                body: JSON.stringify({ email: `${randomUUID()}@integration.test` }),
            })
        ).status,
        200,
    );
    assert.equal(
        (
            await fetch(`${base}/auth/me`, {
                method: 'PUT',
                headers: oauthHeaders,
                body: JSON.stringify({ displayName: 'Updated' }),
            })
        ).status,
        200,
    );

    async function githubLogin(declarations = '') {
        const start = await fetch(`${base}/auth/github/login${declarations}`, {
            redirect: 'manual',
        });
        assert.equal(start.status, 302);
        const authorizationUrl = start.headers.get('location');
        assert.ok(authorizationUrl);
        const state = new URL(authorizationUrl).searchParams.get('state');
        const callback = await fetch(
            `${base}/auth/github/callback?state=${state}&code=integration-code`,
            {
                redirect: 'manual',
                headers: { Cookie: start.headers.getSetCookie()[0].split(';')[0] },
            },
        );
        assert.equal(callback.status, 302);
        const session = callback.headers
            .getSetCookie()
            .find((cookie) => cookie.startsWith('dashboard_session='));
        return { location: callback.headers.get('location') ?? '', session };
    }
    const userIdFrom = (session: string | undefined) => {
        assert.ok(session);
        const token = session.split(';')[0].slice('dashboard_session='.length);
        return Number((jwt.verify(token, JWT_SECRET) as JwtPayload).userId);
    };

    // The login page may not silently create a new account without the age declaration.
    const refused = await githubLogin();
    assert.ok(refused.location.includes('/register?error=github_registration_requirements'));
    assert.equal(refused.session, undefined);
    assert.equal(await prisma.user.count({ where: { githubId: process.env.TEST_GITHUB_ID } }), 0);
    const firstLogin = await githubLogin('?cguAccepted=true&is16OrOlder=true');
    assert.equal(new URL(firstLogin.location).pathname, '/');
    assert.ok(firstLogin.session);
    assert.match(firstLogin.session, /HttpOnly/);
    const githubUserId = userIdFrom(firstLogin.session);
    ids.push(githubUserId);
    // Same as the browser: session cookie plus the frontend Origin required for writes.
    const githubHeaders = {
        Cookie: firstLogin.session.split(';')[0],
        Origin: 'http://localhost:5173',
        'Content-Type': 'application/json',
    };
    const changedEmail = `${randomUUID()}@integration.test`;
    assert.equal(
        (
            await fetch(`${base}/auth/me`, {
                method: 'PUT',
                headers: githubHeaders,
                body: JSON.stringify({ email: changedEmail }),
            })
        ).status,
        200,
    );
    assert.equal(userIdFrom((await githubLogin()).session), githubUserId);
    assert.equal(await prisma.user.count({ where: { email: process.env.TEST_GITHUB_EMAIL } }), 0);
    assert.equal(
        (await prisma.user.findUnique({ where: { id: githubUserId } }))?.email,
        changedEmail,
    );

    assert.equal(
        (await fetch(`${base}/auth/delete-account`, { method: 'DELETE', headers })).status,
        200,
    );
    assert.equal(await prisma.user.count({ where: { id: user.id } }), 0);
    assert.equal(await prisma.widgetConfig.count({ where: { userId: user.id } }), 0);
    assert.equal(await prisma.oAuthToken.count({ where: { userId: user.id } }), 0);
    assert.equal(await prisma.serviceConnection.count({ where: { userId: user.id } }), 0);
    assert.equal(await prisma.user.count({ where: { id: other.id } }), 1);
    assert.equal((await fetch(`${base}/auth/download-data`, { headers })).status, 404);
    console.log(
        'PASS: encrypted token storage, readable secret-free export, GitHub signup/age gate/email editing/re-login, and PostgreSQL cascades.',
    );
}
main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        const app = child;
        if (app && app.exitCode === null) {
            await new Promise((resolve) => {
                app.once('exit', resolve);
                app.kill('SIGTERM');
            });
        }
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
        await prisma.$disconnect();
    });
