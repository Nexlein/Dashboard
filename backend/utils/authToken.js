const jwt = require('jsonwebtoken');
const env = require('./env');

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** JWT returned to the frontend after a password or GitHub login. */
function signAuthToken(user) {
    return jwt.sign({ userId: user.id, isAdmin: user.isAdmin }, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
    });
}

module.exports = { normalizeEmail, signAuthToken };
