import jwt from 'jsonwebtoken';
import { SESSION_COOKIE } from '../utils/session.js';
import { isAllowedOrigin } from '../utils/origins.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Authenticates with the session cookie set at login, or an `Authorization: Bearer` header
 * (API clients, tests). Browsers attach the cookie automatically, so a state-changing
 * request authenticated by it must come from an allowed frontend origin (CSRF protection).
 */
function requireAuth(req, res, next) {
    const authorization = req.get('Authorization');
    const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    const token = bearer || req.cookies?.[SESSION_COOKIE];

    if (!token) return res.status(401).json({ error: 'Missing authentication token' });

    if (!bearer && !SAFE_METHODS.has(req.method) && !isAllowedOrigin(req.get('Origin'))) {
        return res.status(403).json({ error: 'Request origin not allowed' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    next();
}

export default requireAuth;
