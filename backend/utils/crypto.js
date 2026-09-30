const crypto = require('node:crypto');
const { getEncryptionKey } = require('./encryption');

const PREFIX = 'v1:';
const ALGORITHM = 'aes-256-gcm';

function isEncryptedToken(value) {
    return typeof value === 'string' && value.startsWith(PREFIX);
}

function encrypt(text) {
    if (text == null) return text;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
    return `${PREFIX}${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
}

function decrypt(text) {
    if (text == null) return text;
    if (!isEncryptedToken(text)) throw new Error('OAuth token migration required');
    return decryptWithKey(text.slice(PREFIX.length), getEncryptionKey());
}

function decryptWithKey(text, key) {
    if (!/^[a-f0-9]{24}:[a-f0-9]{32}:(?:[a-f0-9]{2})*$/i.test(text)) {
        throw new Error('Invalid encrypted OAuth token');
    }
    const [iv, authTag, encrypted] = text.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}

module.exports = { encrypt, decrypt, isEncryptedToken, decryptWithKey };
