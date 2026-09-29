const crypto = require('node:crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    console.warn(
        'WARNING: ENCRYPTION_KEY is not set or invalid length (must be 32 chars). Using fallback for dev ONLY.',
    );
}

const key = ENCRYPTION_KEY
    ? Buffer.from(ENCRYPTION_KEY, 'utf-8')
    : crypto.scryptSync('dev-fallback-password', 'salt', 32);

function encrypt(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(text) {
    if (!text) return text;
    try {
        const parts = text.split(':');
        if (parts.length !== 3) return text; // Maybe it's a plaintext token from before migration

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption failed', error);
        return null;
    }
}

module.exports = {
    encrypt,
    decrypt,
};
