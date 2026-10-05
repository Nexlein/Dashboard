import type { CookieOptions, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { signAuthToken } from './authToken.ts';

// The JWT lives in an httpOnly cookie: page scripts (and so an XSS payload) cannot read it.
const SESSION_COOKIE = 'dashboard_session';

function cookieOptions(req: Request): CookieOptions {
    return {
        httpOnly: true,
        sameSite: 'lax',
        // Follow the request scheme (X-Forwarded-Proto behind nginx): browsers drop Secure
        // cookies received over plain HTTP, which would break login on an HTTP deployment.
        secure: req.secure,
        path: '/',
    };
}

/** Signs a JWT for `user` and stores it in the session cookie until it expires. */
function startSession(req: Request, res: Response, user: Pick<User, 'id' | 'isAdmin'>) {
    const token = signAuthToken(user);
    const { exp } = jwt.decode(token) as { exp: number };
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions(req), expires: new Date(exp * 1000) });
}

function endSession(req: Request, res: Response) {
    res.clearCookie(SESSION_COOKIE, cookieOptions(req));
}

export { SESSION_COOKIE, startSession, endSession };
