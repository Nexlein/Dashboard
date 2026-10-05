const crypto = require('node:crypto');

const originalEnv = { ...process.env };
const KEY_SALT = 'dashboard-widget-encryption';

// Written by the previous encryption modules with ENCRYPTION_KEY=FIXTURE_SECRET.
// Stored data must stay readable, so these must keep decrypting.
const FIXTURE_SECRET = 'compat-fixture-secret-that-is-32-chars-long';
const STORED_JSON = {
    _encrypted: true,
    iv: 'b8e6c0ef06828dbc9f1ac9b27a48c933',
    authTag: '83b2a34a0097867da84c11d30dbfbdab',
    data: '5c463193d28b28c2a34085dbf2f329fda30e44f7dd3efc25f4f30652b94bb36a8c346ab0',
};
const STORED_STRING =
    'v1:19b9e71abb45a9f7a858b7d1:950e61bc0a00d43bb53974da5d11a36a:d2fa34fcf2fcd5a6f443c7b15705dafafd9e';

// The module caches the derived key: reload it after changing the environment.
function load() {
    jest.resetModules();
    return require('../utils/encryption');
}

function tamper(hex) {
    return hex.slice(0, -2) + (hex.endsWith('00') ? 'ff' : '00');
}

beforeEach(() => {
    process.env.JWT_SECRET = 'encryption-test-jwt-secret';
    delete process.env.ENCRYPTION_KEY;
});
afterAll(() => {
    process.env = originalEnv;
});

describe('key derivation', () => {
    test.each(['a'.repeat(64), 'short-secret', 'é'.repeat(32)])(
        'derives the key from ENCRYPTION_KEY of any length (%#)',
        (secret) => {
            process.env.ENCRYPTION_KEY = secret;
            const { getEncryptionKey } = load();
            expect(getEncryptionKey()).toEqual(crypto.scryptSync(secret, KEY_SALT, 32));
        },
    );

    test('falls back to JWT_SECRET when ENCRYPTION_KEY is unset', () => {
        const { getEncryptionKey } = load();
        expect(getEncryptionKey()).toEqual(crypto.scryptSync(process.env.JWT_SECRET, KEY_SALT, 32));
    });

    test('refuses to encrypt without any secret', () => {
        delete process.env.JWT_SECRET;
        const { encryptString } = load();
        expect(() => encryptString('token')).toThrow(/must be set/);
    });
});

describe('JSON values', () => {
    test('round-trips an object with a fresh IV each time', () => {
        const { encryptJson, decryptJsonStrict } = load();
        const params = { city: 'Paris', coins: ['bitcoin'] };
        const sealed = encryptJson(params);
        expect(sealed).toMatchObject({ _encrypted: true });
        expect(JSON.stringify(sealed)).not.toContain('Paris');
        expect(decryptJsonStrict(sealed)).toEqual(params);
        expect(encryptJson(params).iv).not.toBe(sealed.iv);
    });

    test('passes through values that are not encrypted objects', () => {
        const { encryptJson, decryptJsonStrict } = load();
        for (const value of [null, undefined, 'text', 42]) expect(encryptJson(value)).toBe(value);
        expect(decryptJsonStrict({ city: 'Paris' })).toEqual({ city: 'Paris' });
    });

    test('reads payloads written by the previous implementation', () => {
        process.env.ENCRYPTION_KEY = FIXTURE_SECRET;
        expect(load().decryptJsonStrict(STORED_JSON)).toEqual({
            city: 'Paris',
            coins: ['bitcoin'],
        });
    });

    test('strict decryption throws on tampering; decryptJson reports an error instead', () => {
        const { encryptJson, decryptJson, decryptJsonStrict } = load();
        const sealed = encryptJson({ city: 'Paris' });
        const damaged = { ...sealed, data: tamper(sealed.data) };
        expect(() => decryptJsonStrict(damaged)).toThrow();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(decryptJson(damaged)).toEqual({ error: 'Failed to decrypt parameters' });
    });
});

describe('string values', () => {
    test('round-trips a token in the v1 format', () => {
        const { encryptString, decryptString } = load();
        const sealed = encryptString('github-token');
        expect(sealed).toMatch(/^v1:[a-f0-9]{24}:[a-f0-9]{32}:[a-f0-9]+$/);
        expect(decryptString(sealed)).toBe('github-token');
        expect(encryptString('github-token')).not.toBe(sealed);
    });

    test('passes null and undefined through', () => {
        const { encryptString, decryptString } = load();
        expect(encryptString(null)).toBeNull();
        expect(decryptString(undefined)).toBeUndefined();
    });

    test('reads tokens written by the previous implementation', () => {
        process.env.ENCRYPTION_KEY = FIXTURE_SECRET;
        expect(load().decryptString(STORED_STRING)).toBe('gho_legacyToken123');
    });

    test('rejects plaintext, damaged and wrong-key values instead of sending them to GitHub', () => {
        const { encryptString, decryptString } = load();
        expect(() => decryptString('plaintext-token')).toThrow(/not an encrypted string/);
        expect(() => decryptString('v1:broken')).toThrow();
        const sealed = encryptString('token');
        expect(() => decryptString(tamper(sealed))).toThrow();

        process.env.JWT_SECRET = 'another-secret';
        expect(() => load().decryptString(sealed)).toThrow();
    });
});
