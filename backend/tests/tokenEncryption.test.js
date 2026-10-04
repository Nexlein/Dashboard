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
