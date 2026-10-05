import jwt, { type SignOptions } from 'jsonwebtoken';
import type { User } from '@prisma/client';
import env from './env.ts';

/** Claims of the session JWT. */
export type AuthPayload = { userId: number; isAdmin: boolean };

function normalizeEmail(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** JWT returned to the frontend after a password or GitHub login. */
function signAuthToken(user: Pick<User, 'id' | 'isAdmin'>): string {
    const payload: AuthPayload = { userId: user.id, isAdmin: user.isAdmin };
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    });
}

/** Verifies a JWT and checks its claims; throws when the token is invalid or expired. */
function verifyAuthToken(token: string): AuthPayload {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    if (typeof decoded !== 'object' || typeof decoded.userId !== 'number') {
        throw new Error('Unexpected token payload');
    }
    return { userId: decoded.userId, isAdmin: decoded.isAdmin === true };
}

export { normalizeEmail, signAuthToken, verifyAuthToken };
