import { describe, test, expect, vi, beforeEach, afterAll } from 'vitest';
import crypto from 'node:crypto';

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

// The module caches the derived key: reload it after changing the environment.
async function load() {
    vi.resetModules();
    return import('../src/utils/encryption.ts');
}

function tamper(hex: string) {
    return hex.slice(0, -2) + (hex.endsWith('00') ? 'ff' : '00');
}

beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = 'encryption-test-auth-secret';
    delete process.env.ENCRYPTION_KEY;
});
afterAll(() => {
    process.env = originalEnv;
});

describe('key derivation', () => {
    test.each(['a'.repeat(64), 'short-secret', 'é'.repeat(32)])(
        'derives the key from ENCRYPTION_KEY of any length (%#)',
        async (secret) => {
            process.env.ENCRYPTION_KEY = secret;
            const { getEncryptionKey } = await load();
            expect(getEncryptionKey()).toEqual(crypto.scryptSync(secret, KEY_SALT, 32));
        },
    );

    test('falls back to BETTER_AUTH_SECRET when ENCRYPTION_KEY is unset', async () => {
        const { getEncryptionKey } = await load();
        expect(getEncryptionKey()).toEqual(
            crypto.scryptSync('encryption-test-auth-secret', KEY_SALT, 32),
        );
    });

    test('refuses to encrypt without any secret', async () => {
        delete process.env.BETTER_AUTH_SECRET;
        const { encryptJson } = await load();
        expect(() => encryptJson({ apiKey: 'key' })).toThrow(/must be set/);
    });
});

describe('JSON values', () => {
    test('round-trips an object with a fresh IV each time', async () => {
        const { encryptJson, decryptJsonStrict } = await load();
        const params = { city: 'Paris', coins: ['bitcoin'] };
        const sealed = encryptJson(params);
        expect(sealed).toMatchObject({ _encrypted: true });
        expect(JSON.stringify(sealed)).not.toContain('Paris');
        expect(decryptJsonStrict(sealed)).toEqual(params);
        expect(encryptJson(params).iv).not.toBe(sealed.iv);
    });

    test('passes through values that are not encrypted objects', async () => {
        const { encryptJson, decryptJsonStrict } = await load();
        for (const value of [null, undefined, 'text', 42]) expect(encryptJson(value)).toBe(value);
        expect(decryptJsonStrict({ city: 'Paris' })).toEqual({ city: 'Paris' });
    });

    test('reads payloads written by the previous implementation', async () => {
        process.env.ENCRYPTION_KEY = FIXTURE_SECRET;
        expect((await load()).decryptJsonStrict(STORED_JSON)).toEqual({
            city: 'Paris',
            coins: ['bitcoin'],
        });
    });

    test('strict decryption throws on tampering; decryptJson reports an error instead', async () => {
        const { encryptJson, decryptJson, decryptJsonStrict } = await load();
        const sealed = encryptJson({ city: 'Paris' });
        const damaged = { ...sealed, data: tamper(sealed.data) };
        expect(() => decryptJsonStrict(damaged)).toThrow();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(decryptJson(damaged)).toEqual({ error: 'Failed to decrypt parameters' });
    });
});
