import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { Response } from 'supertest';
import { vi } from 'vitest';

/** Replaces global fetch with a plain stub; vitest.config.ts restores it after each test. */
export function stubFetch() {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET must be set before signing test tokens');
    return secret;
}

/** Signs a token with the secret the app under test uses. */
export function signToken(payload: object, options?: SignOptions): string {
    return jwt.sign(payload, jwtSecret(), options);
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, jwtSecret()) as JwtPayload;
}

/** The Set-Cookie headers of a supertest response. */
export function setCookies(res: Response): string[] {
    const header: unknown = res.headers['set-cookie'];
    return Array.isArray(header) ? header : [];
}
