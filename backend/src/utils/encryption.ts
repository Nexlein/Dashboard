import crypto from 'node:crypto';

// AES-256-GCM with a key derived from ENCRYPTION_KEY (BETTER_AUTH_SECRET when unset).
// Encrypts objects (widget params, service API keys) for JSON columns, hex encoded:
//   { _encrypted: true, iv, authTag, data }
// Keep the secret stable: changing it makes stored data unreadable. (OAuth tokens are encrypted
// by Better Auth: account.encryptOAuthTokens in src/auth.ts.)

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce size; decryption accepts the IV stored with the data
const KEY_SALT = 'dashboard-widget-encryption';

/** Shape of an object encrypted for a JSON column. */
export type EncryptedJson = { _encrypted: true; iv: string; authTag: string; data: string };
type Sealed = Omit<EncryptedJson, '_encrypted'>;

let key: Buffer | null = null;
function getEncryptionKey(): Buffer {
    if (key) return key;
    const secret = process.env.ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;
    if (!secret) {
        throw new Error(
            'ENCRYPTION_KEY or BETTER_AUTH_SECRET must be set in environment variables',
        );
    }
    key = crypto.scryptSync(secret, KEY_SALT, 32);
    return key;
}

function seal(plaintext: string): Sealed {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    const data = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    return { iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex'), data };
}

/** Throws when the key is wrong or the ciphertext was tampered with. */
function open({ iv, authTag, data }: Sealed): string {
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

/** Encrypts an object for a JSON column. Non-objects are returned unchanged. */
function encryptJson(value: Record<string, unknown>): EncryptedJson;
function encryptJson<T>(value: T): T | EncryptedJson;
function encryptJson<T>(value: T): T | EncryptedJson {
    if (!value || typeof value !== 'object') return value;
    return { _encrypted: true as const, ...seal(JSON.stringify(value)) };
}

/** Decrypts a payload from encryptJson; unencrypted values pass through. Throws on failure. */
function isEncryptedJson(payload: unknown): payload is EncryptedJson {
    return typeof payload === 'object' && payload !== null && '_encrypted' in payload;
}

function decryptJsonStrict(payload: unknown): unknown {
    if (!isEncryptedJson(payload)) return payload;
    return JSON.parse(open(payload));
}

/** Like decryptJsonStrict, but reports failure as `{ error }` so one bad row cannot crash a list. */
function decryptJson(payload: unknown): unknown {
    try {
        return decryptJsonStrict(payload);
    } catch (error) {
        console.error('Failed to decrypt stored JSON:', (error as Error).message);
        return { error: 'Failed to decrypt parameters' };
    }
}

export { getEncryptionKey, encryptJson, decryptJson, decryptJsonStrict };
