const crypto = require('node:crypto');

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

let key = null;
function getEncryptionKey() {
    if (key) return key;
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set in environment variables');
    }
    key = crypto.scryptSync(secret, KEY_SALT, 32);
    return key;
}

function seal(plaintext) {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    const data = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    return { iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex'), data };
}

/** Throws when the key is wrong or the ciphertext was tampered with. */
function open({ iv, authTag, data }) {
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

/** Encrypts an object for a JSON column. Non-objects are returned unchanged. */
function encryptJson(value) {
    if (!value || typeof value !== 'object') return value;
    return { _encrypted: true, ...seal(JSON.stringify(value)) };
}

/** Decrypts a payload from encryptJson; unencrypted values pass through. Throws on failure. */
function decryptJsonStrict(payload) {
    if (!payload || !payload._encrypted) return payload;
    return JSON.parse(open(payload));
}

/** Like decryptJsonStrict, but reports failure as `{ error }` so one bad row cannot crash a list. */
function decryptJson(payload) {
    try {
        return decryptJsonStrict(payload);
    } catch (error) {
        console.error('Failed to decrypt stored JSON:', error.message);
        return { error: 'Failed to decrypt parameters' };
    }
}

/** Encrypts a string for a text column. null and undefined are returned unchanged. */
function encryptString(text) {
    if (text == null) return text;
    const { iv, authTag, data } = seal(text);
    return `v1:${iv}:${authTag}:${data}`;
}

/** Decrypts a value from encryptString. Throws on plaintext, damaged data or a wrong key. */
function decryptString(text) {
    if (text == null) return text;
    const match = STRING_PATTERN.exec(text);
    if (!match) throw new Error('Value is not an encrypted string');
    return open({ iv: match[1], authTag: match[2], data: match[3] });
}

module.exports = {
    getEncryptionKey,
    encryptJson,
    decryptJson,
    decryptJsonStrict,
    encryptString,
    decryptString,
};
