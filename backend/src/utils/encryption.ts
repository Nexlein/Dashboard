import crypto from 'node:crypto';

// AES-256-GCM with a key derived from ENCRYPTION_KEY (JWT_SECRET when unset).
// One cipher, two storage formats:
// - objects (widget params, service credentials), stored in JSON columns:
//   { _encrypted: true, iv, authTag, data }
// - strings (OAuth tokens), stored in text columns: "v1:<iv>:<authTag>:<data>"
// Both are hex encoded. Keep the secret stable: changing it makes stored data unreadable.

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce size; decryption accepts the IV stored with the data
const KEY_SALT = 'dashboard-widget-encryption';
const STRING_PATTERN = /^v1:([a-f0-9]{24}):([a-f0-9]{32}):((?:[a-f0-9]{2})*)$/i;

/** Shape of an object encrypted for a JSON column. */
export type EncryptedJson = { _encrypted: true; iv: string; authTag: string; data: string };
type Sealed = Omit<EncryptedJson, '_encrypted'>;

let key: Buffer | null = null;
function getEncryptionKey(): Buffer {
    if (key) return key;
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set in environment variables');
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

/** Encrypts a string for a text column. null and undefined are returned unchanged. */
function encryptString(text: string): string;
function encryptString(text: null | undefined): null | undefined;
function encryptString(text: string | null | undefined): string | null | undefined {
    if (text == null) return text;
    const { iv, authTag, data } = seal(text);
    return `v1:${iv}:${authTag}:${data}`;
}

/** Decrypts a value from encryptString. Throws on plaintext, damaged data or a wrong key. */
function decryptString(text: string): string;
function decryptString(text: null | undefined): null | undefined;
function decryptString(text: string | null | undefined): string | null | undefined {
    if (text == null) return text;
    const match = STRING_PATTERN.exec(text);
    if (!match) throw new Error('Value is not an encrypted string');
    return open({ iv: match[1], authTag: match[2], data: match[3] });
}

export {
    getEncryptionKey,
    encryptJson,
    decryptJson,
    decryptJsonStrict,
    encryptString,
    decryptString,
};
