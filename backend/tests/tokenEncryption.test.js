const crypto = require('node:crypto');
const originalEnv = { ...process.env };

beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'token-test-secret';
    delete process.env.ENCRYPTION_KEY;
});
afterAll(() => {
    process.env = originalEnv;
});

test.each(['a'.repeat(64), 'short-secret', 'é'.repeat(32)])(
    'uses the existing key derivation for arbitrary secret lengths',
    (secret) => {
        process.env.ENCRYPTION_KEY = secret;
        const { encrypt, decrypt } = require('../utils/tokenEncryption');
        const { getEncryptionKey } = require('../utils/encryption');
        expect(getEncryptionKey()).toEqual(
            crypto.scryptSync(secret, 'dashboard-widget-encryption', 32),
        );
        const encrypted = encrypt('github-token');
        expect(decrypt(encrypted)).toBe('github-token');
        expect(encrypt('github-token')).not.toBe(encrypted);
    },
);

test('production uses JWT_SECRET when no dedicated encryption secret is configured', () => {
    process.env.NODE_ENV = 'production';
    const { encrypt, decryptWithKey } = require('../utils/tokenEncryption');
    const encrypted = encrypt('private-token').slice(3);
    expect(() =>
        decryptWithKey(encrypted, crypto.scryptSync('dev-fallback-password', 'salt', 32)),
    ).toThrow();
    expect(
        decryptWithKey(
            encrypted,
            crypto.scryptSync(process.env.JWT_SECRET, 'dashboard-widget-encryption', 32),
        ),
    ).toBe('private-token');
});

test('refuses to encrypt without a deployment secret', () => {
    delete process.env.JWT_SECRET;
    expect(() => require('../utils/tokenEncryption').encrypt('token')).toThrow(/must be set/);
});

test('rejects unencrypted, damaged and wrong-key tokens instead of sending them to GitHub', () => {
    const { encrypt, decrypt } = require('../utils/tokenEncryption');
    expect(() => decrypt('plaintext')).toThrow(/migration/);
    expect(() => decrypt('v1:broken')).toThrow();
    const encrypted = encrypt('token');
    expect(() =>
        decrypt(encrypted.slice(0, -2) + (encrypted.endsWith('00') ? 'ff' : '00')),
    ).toThrow();
    jest.resetModules();
    process.env.JWT_SECRET = 'another-secret';
    expect(() => require('../utils/tokenEncryption').decrypt(encrypted)).toThrow();
});

function fakeDatabase(rows) {
    return {
        oAuthToken: {
            findMany: jest.fn(async ({ where, take }) =>
                rows
                    .filter((row) => !where || row.id > where.id.gt)
                    .slice(0, take)
                    .map((row) => ({ ...row })),
            ),
            updateMany: jest.fn(async ({ where, data }) => {
                const row = rows.find(
                    (r) =>
                        r.id === where.id &&
                        r.accessToken === where.accessToken &&
                        r.refreshToken === where.refreshToken,
                );
                if (!row) return { count: 0 };
                Object.assign(row, data);
                return { count: 1 };
            }),
        },
    };
}

test('migrates every batch, preserves refresh tokens and is idempotent', async () => {
    const { migrateOAuthTokens } = require('../utils/migrateOAuthTokens');
    const { decrypt } = require('../utils/tokenEncryption');
    const rows = Array.from({ length: 105 }, (_, id) => ({
        id,
        accessToken: `access-${id}`,
        refreshToken: id % 2 ? null : `refresh-${id}`,
    }));
    const db = fakeDatabase(rows);
    expect(await migrateOAuthTokens(db)).toBe(105);
    expect(decrypt(rows[0].accessToken)).toBe('access-0');
    expect(decrypt(rows[0].refreshToken)).toBe('refresh-0');
    expect(rows[1].refreshToken).toBeNull();
    expect(decrypt(rows[104].accessToken)).toBe('access-104');
    const saved = JSON.stringify(rows);
    expect(await migrateOAuthTokens(db)).toBe(0);
    expect(JSON.stringify(rows)).toBe(saved);
});

test.each([undefined, 'a'.repeat(32)])(
    'migrates the initial PR ciphertext using its old key (%s)',
    async (secret) => {
        if (secret) process.env.ENCRYPTION_KEY = secret;
        const oldKey = secret
            ? Buffer.from(secret)
            : crypto.scryptSync('dev-fallback-password', 'salt', 32);
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', oldKey, iv);
        const data = cipher.update('legacy-token', 'utf8', 'hex') + cipher.final('hex');
        const rows = [
            {
                id: 1,
                accessToken: `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${data}`,
                refreshToken: null,
            },
        ];
        expect(
            await require('../utils/migrateOAuthTokens').migrateOAuthTokens(fakeDatabase(rows)),
        ).toBe(1);
        expect(require('../utils/tokenEncryption').decrypt(rows[0].accessToken)).toBe(
            'legacy-token',
        );
    },
);

test('stops on damaged ciphertext without overwriting it', async () => {
    const rows = [{ id: 1, accessToken: 'v1:damaged', refreshToken: null }];
    const db = fakeDatabase(rows);
    await expect(require('../utils/migrateOAuthTokens').migrateOAuthTokens(db)).rejects.toThrow();
    expect(db.oAuthToken.updateMany).not.toHaveBeenCalled();
});

test('does not overwrite a concurrent token refresh', async () => {
    const { encrypt, decrypt } = require('../utils/tokenEncryption');
    const rows = [{ id: 1, accessToken: 'old-access', refreshToken: null }];
    const db = fakeDatabase(rows);
    const update = db.oAuthToken.updateMany.getMockImplementation();
    db.oAuthToken.updateMany.mockImplementation(async (args) => {
        rows[0].accessToken = encrypt('fresh-access');
        return update(args);
    });
    expect(await require('../utils/migrateOAuthTokens').migrateOAuthTokens(db)).toBe(0);
    expect(decrypt(rows[0].accessToken)).toBe('fresh-access');
});
