const jwt = require('jsonwebtoken');
const { getCache } = require('../utils/redisCache');

async function requireAuth(req, res, next) {
    const authorization = req.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authentication token' });
    }

    let decoded;
    try {
        decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    // Check if this token's jti has been revoked (e.g. after account deletion)
    if (decoded.jti) {
        const revoked = await getCache(`revoked_jti:${decoded.jti}`);
        if (revoked) {
            return res.status(401).json({ error: 'Invalid or expired authentication token' });
        }
    }

    req.user = decoded;
    next();
}

module.exports = requireAuth;
