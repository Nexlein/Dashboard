const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
    const authorization = req.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authentication token' });
    }

    try {
        req.user = jwt.verify(
            authorization.slice(7),
            process.env.JWT_SECRET
        );
    } catch {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    next();
};
