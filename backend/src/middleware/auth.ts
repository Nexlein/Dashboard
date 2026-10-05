import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.ts';
import env from '../utils/env.ts';
import { isAllowedOrigin } from '../utils/origins.ts';

/** The signed-in user, as the routes behind requireAuth see it. */
export type AuthPayload = { userId: number; role: string };

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Swagger UI calls the API from the API's own origin.
const API_ORIGIN = new URL(env.BETTER_AUTH_URL).origin;

/**
 * Authenticates the Better Auth session cookie. Browsers attach the cookie automatically, so a
 * state-changing request must also come from an allowed frontend origin (CSRF protection; Better
 * Auth applies the same rule to its own /api/auth/* routes).
 */
async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return res.status(401).json({ error: 'Authentication required' });

    const origin = req.get('Origin');
    if (!SAFE_METHODS.has(req.method) && !isAllowedOrigin(origin) && origin !== API_ORIGIN) {
        return res.status(403).json({ error: 'Request origin not allowed' });
    }

    req.user = { userId: Number(session.user.id), role: session.user.role ?? 'user' };
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
