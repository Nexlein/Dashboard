const crypto = require('node:crypto');
const { encrypt, decrypt, isEncryptedToken, decryptWithKey } = require('./tokenEncryption');
const { getEncryptionKey } = require('./encryption');

function migrateValue(value) {
    if (value == null) return value;
    if (isEncryptedToken(value)) {
        decrypt(value); // Fail closed on a wrong key or damaged ciphertext.
        return value;
    }
    let plaintext = value;
    if (value.includes(':')) {
        // Read-only compatibility with the initial, unversioned PR format.
        // The public development key is NEVER used to encrypt new data.
        const legacyKey = process.env.ENCRYPTION_KEY
            ? Buffer.from(process.env.ENCRYPTION_KEY, 'utf8')
            : crypto.scryptSync('dev-fallback-password', 'salt', 32);
        plaintext = decryptWithKey(value, legacyKey);
    }
    return encrypt(plaintext);
}

async function migrateOAuthTokens(prisma) {
    getEncryptionKey(); // Validate deployment configuration even when the table is empty.
    let cursor;
    let migrated = 0;
    while (true) {
        const tokens = await prisma.oAuthToken.findMany({
            select: { id: true, accessToken: true, refreshToken: true },
            orderBy: { id: 'asc' },
            take: 100,
            ...(cursor === undefined ? {} : { where: { id: { gt: cursor } } }),
        });
        if (tokens.length === 0) return migrated;
        for (const token of tokens) {
            const accessToken = migrateValue(token.accessToken);
            const refreshToken = migrateValue(token.refreshToken);
            if (accessToken !== token.accessToken || refreshToken !== token.refreshToken) {
                // Do not overwrite tokens refreshed or migrated by another replica.
                const result = await prisma.oAuthToken.updateMany({
                    where: {
                        id: token.id,
                        accessToken: token.accessToken,
                        refreshToken: token.refreshToken,
                    },
                    data: { accessToken, refreshToken },
                });
                migrated += result.count;
            }
        }
        cursor = tokens[tokens.length - 1].id;
    }
}

module.exports = { migrateOAuthTokens };
