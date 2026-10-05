import type { NextFunction, Request, Response } from 'express';
import { verifyAuthToken, type AuthPayload } from '../utils/authToken.ts';
import { SESSION_COOKIE } from '../utils/session.ts';
import { isAllowedOrigin } from '../utils/origins.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Authenticates with the session cookie set at login, or an `Authorization: Bearer` header
 * (API clients, tests). Browsers attach the cookie automatically, so a state-changing
 * request authenticated by it must come from an allowed frontend origin (CSRF protection).
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authorization = req.get('Authorization');
    const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    const token: string | undefined = bearer || req.cookies?.[SESSION_COOKIE];

    if (!token) return res.status(401).json({ error: 'Missing authentication token' });

    if (!bearer && !SAFE_METHODS.has(req.method) && !isAllowedOrigin(req.get('Origin'))) {
        return res.status(403).json({ error: 'Request origin not allowed' });
    }

    try {
        req.user = verifyAuthToken(token);
    } catch {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    next();
}

/**
 * The user authenticated by requireAuth. Throws a 401 (handled by errorHandler) if a route
 * reads it without being behind requireAuth, instead of crashing on `undefined`.
 */
export function authUser(req: Request): AuthPayload {
    if (!req.user) throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
    return req.user;
}

export default requireAuth;
