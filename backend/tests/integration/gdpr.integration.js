// Run against a disposable PostgreSQL database, never a development/production DB.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID, randomInt } = require('node:crypto');
const net = require('node:net');

if (!process.env.TEST_DATABASE_URL)
    throw new Error('TEST_DATABASE_URL must point to an isolated test database');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = 'gdpr-integration-jwt-secret';
process.env.ENCRYPTION_KEY = 'gdpr-integration-encryption-secret-that-is-not-32-bytes';
process.env.REDIS_URL = '';
process.env.GITHUB_CLIENT_ID = 'integration-client';
process.env.GITHUB_CLIENT_SECRET = 'integration-client-secret';
process.env.GITHUB_CALLBACK_URL = 'http://localhost/auth/github/callback';
process.env.TEST_GITHUB_ID = String(randomInt(1000000, 1000000000));
process.env.TEST_GITHUB_EMAIL = `${randomUUID()}@integration.test`;
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { encryptParams, encryptJson } = require('../../utils/encryption');
const { decrypt } = require('../../utils/crypto');
const { migrateOAuthTokens } = require('../../utils/migrateOAuthTokens');
const prisma = new PrismaClient();
let child;
const ids = [];

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
                    params: encryptParams({ city: 'Paris' }),
                    refreshRate: 60,
                    layout: { x: 0, y: 0, w: 3, h: 2 },
                },
            },
            tokens: {
                create: {
                    provider: 'github',
                    accessToken: 'legacy-access',
                    refreshToken: 'legacy-refresh',
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

    const port = await new Promise((resolve) => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
    });
    child = spawn(
        process.execPath,
        ['--require', require.resolve('./github.fixture'), 'server.js'],
        {
            cwd: require('node:path').join(__dirname, '../..'),
            env: { ...process.env, PORT: String(port) },
            stdio: ['ignore', 'pipe', 'pipe'],
        },
    );
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Server did not start')), 15000);
        child.stdout.on('data', (chunk) => {
            if (String(chunk).includes('Server running on port')) {
                clearTimeout(timer);
                resolve();
            }
        });
        child.once('exit', () => {
            clearTimeout(timer);
            reject(new Error('Server exited before startup completed'));
        });
        child.once('error', reject);
    });
    const stored = await prisma.oAuthToken.findUnique({
        where: { userId_provider: { userId: user.id, provider: 'github' } },
    });
    assert.ok(stored.accessToken.startsWith('v1:'));
    assert.equal(decrypt(stored.accessToken), 'legacy-access');
    assert.equal(decrypt(stored.refreshToken), 'legacy-refresh');
    assert.equal(await migrateOAuthTokens(prisma), 0);

    const base = `http://127.0.0.1:${port}`;
    const headers = {
        Authorization: `Bearer ${jwt.sign({ userId: user.id }, process.env.JWT_SECRET)}`,
    };
    const response = await fetch(`${base}/auth/download-data`, { headers });
    assert.equal(response.status, 200);
    const exported = await response.json();
    assert.deepEqual(exported.widgets[0].params, { city: 'Paris' });
    assert.equal(exported.password, undefined);
    assert.equal(exported.tokens[0].accessToken, undefined);
    assert.equal(exported.serviceConnections[0].encryptedCredentials, undefined);
    assert.equal(exported.tokens[0].provider, 'github');
    assert.equal((await fetch(`${base}/auth/download-data`)).status, 401);

    const oauthHeaders = {
        Authorization: `Bearer ${jwt.sign({ userId: other.id }, process.env.JWT_SECRET)}`,
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
        const state = new URL(start.headers.get('location')).searchParams.get('state');
        const callback = await fetch(
            `${base}/auth/github/callback?state=${state}&code=integration-code`,
            {
                redirect: 'manual',
                headers: { Cookie: start.headers.get('set-cookie').split(';')[0] },
            },
        );
        assert.equal(callback.status, 302);
        return callback.headers.get('location');
    }

    // The login page may not silently create a new account without the age declaration.
    assert.ok((await githubLogin()).includes('/register?error=github_registration_requirements'));
    assert.equal(await prisma.user.count({ where: { githubId: process.env.TEST_GITHUB_ID } }), 0);
    const firstLogin = await githubLogin('?cguAccepted=true&is16OrOlder=true');
    const firstJwt = new URL(firstLogin).searchParams.get('token');
    const githubUserId = jwt.verify(firstJwt, process.env.JWT_SECRET).userId;
    ids.push(githubUserId);
    const githubHeaders = {
        Authorization: `Bearer ${firstJwt}`,
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
    const repeatJwt = new URL(await githubLogin()).searchParams.get('token');
    assert.equal(jwt.verify(repeatJwt, process.env.JWT_SECRET).userId, githubUserId);
    assert.equal(await prisma.user.count({ where: { email: process.env.TEST_GITHUB_EMAIL } }), 0);
    assert.equal(
        (await prisma.user.findUnique({ where: { id: githubUserId } })).email,
        changedEmail,
    );

    assert.equal(
        (await fetch(`${base}/auth/delete-account`, { method: 'DELETE', headers })).status,
        200,
    );
    assert.equal(await prisma.user.count({ where: { id: user.id } }), 0);
    for (const model of ['widgetConfig', 'oAuthToken', 'serviceConnection'])
        assert.equal(await prisma[model].count({ where: { userId: user.id } }), 0);
    assert.equal(await prisma.user.count({ where: { id: other.id } }), 1);
    assert.equal((await fetch(`${base}/auth/download-data`, { headers })).status, 404);
    console.log(
        'PASS: startup migration, idempotence, readable secret-free export, GitHub signup/age gate/email editing/re-login, and PostgreSQL cascades.',
    );
}
main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (child && child.exitCode === null) {
            await new Promise((resolve) => {
                child.once('exit', resolve);
                child.kill('SIGTERM');
            });
        }
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
        await prisma.$disconnect();
    });
