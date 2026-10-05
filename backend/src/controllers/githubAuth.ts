import crypto from 'node:crypto';
import type { CookieOptions, Request } from 'express';
import type { Prisma } from '@prisma/client';
import { getCache, setCache, deleteCache } from '../utils/redisCache.ts';
import { encryptString } from '../utils/encryption.ts';
import { getGitHubProfile, getVerifiedGitHubEmail } from '../services/githubIdentity.ts';
import asyncHandler from '../utils/asyncHandler.ts';
import { normalizeEmail } from '../utils/authToken.ts';
import { startSession } from '../utils/session.ts';
import prisma from '../utils/prisma.ts';
import { authUser } from '../middleware/auth.ts';

// GitHub OAuth: link an account to GitHub, or sign in / sign up with GitHub.

const GITHUB_LINK_TTL = 10 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// What githubLink / githubLogin store under the state, read back by the callback.
type PendingFlow = {
    browserSecretHash: string;
    expiresAt: number;
    userId?: number;
    registrationAccepted?: boolean;
};
type TokenResponse = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
};

function githubConfig() {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;
    if (!clientId || !clientSecret || !callbackUrl) return null;
    return { clientId, clientSecret, callbackUrl };
}

function githubCookieOptions(req: Request): CookieOptions {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.secure, // same rule as the session cookie (utils/session.ts)
        path: '/auth/github/callback',
    };
}

export const githubLink = asyncHandler(async (req, res) => {
    const config = githubConfig();
    if (!config) return res.status(503).json({ error: 'GitHub linking is not configured' });
    const userId = authUser(req).userId;
    const state = crypto.randomBytes(32).toString('hex');
    const browserSecret = crypto.randomBytes(32).toString('hex');
    await setCache(
        `github_link:${state}`,
        {
            userId,
            browserSecretHash: crypto.createHash('sha256').update(browserSecret).digest('hex'),
            expiresAt: Date.now() + GITHUB_LINK_TTL,
        },
        GITHUB_LINK_TTL,
    );
    res.cookie(`github_link_${state}`, browserSecret, {
        ...githubCookieOptions(req),
        maxAge: GITHUB_LINK_TTL,
    });
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.callbackUrl,
        scope: 'user:email read:user repo',
        state,
    });
    const authorizationUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    if (req.query.format === 'json') return res.json({ authorizationUrl });
    res.redirect(authorizationUrl);
});

export const githubLogin = asyncHandler(async (req, res) => {
    const config = githubConfig();
    if (!config) return res.status(503).json({ error: 'GitHub login is not configured' });
    const state = crypto.randomBytes(32).toString('hex');
    const browserSecret = crypto.randomBytes(32).toString('hex');
    await setCache(
        `github_login:${state}`,
        {
            registrationAccepted:
                req.query.cguAccepted === 'true' && req.query.is16OrOlder === 'true',
            browserSecretHash: crypto.createHash('sha256').update(browserSecret).digest('hex'),
            expiresAt: Date.now() + GITHUB_LINK_TTL,
        },
        GITHUB_LINK_TTL,
    );
    res.cookie(`github_login_${state}`, browserSecret, {
        ...githubCookieOptions(req),
        maxAge: GITHUB_LINK_TTL,
    });
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.callbackUrl,
        scope: 'user:email read:user repo',
        state,
    });
    const authorizationUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    if (req.query.format === 'json') return res.json({ authorizationUrl });
    res.redirect(authorizationUrl);
});

export const githubCallback = asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state))
        return res.status(400).json({ error: 'Missing or invalid state' });
    let isLogin = true;
    let pendingLink = await getCache<PendingFlow>(`github_login:${state}`);
    if (!pendingLink) {
        isLogin = false;
        pendingLink = await getCache<PendingFlow>(`github_link:${state}`);
    }
    if (!pendingLink) return res.status(400).json({ error: 'Unknown or already used state' });
    const cookieName = isLogin ? `github_login_${state}` : `github_link_${state}`;
    const cookieOptions = githubCookieOptions(req);
    if (pendingLink.expiresAt <= Date.now()) {
        await deleteCache(isLogin ? `github_login:${state}` : `github_link:${state}`);
        res.clearCookie(cookieName, cookieOptions);
        return res.status(400).json({ error: 'Expired state' });
    }
    const browserSecret = req.cookies[cookieName];
    if (
        typeof browserSecret !== 'string' ||
        !/^[a-f0-9]{64}$/.test(browserSecret) ||
        !crypto.timingSafeEqual(
            crypto.createHash('sha256').update(browserSecret).digest(),
            Buffer.from(pendingLink.browserSecretHash, 'hex'),
        )
    ) {
        return res
            .status(403)
            .json({ error: 'GitHub flow must finish in the browser that started it' });
    }
    await deleteCache(isLogin ? `github_login:${state}` : `github_link:${state}`);
    res.clearCookie(cookieName, cookieOptions);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (req.query.error) return res.redirect(`${frontendUrl}/services?error=github_auth_failed`);
    if (typeof code !== 'string' || !code)
        return res.redirect(`${frontendUrl}/services?error=github_missing_code`);

    let data: TokenResponse;
    try {
        const config = githubConfig();
        if (!config) throw new Error('GitHub OAuth is not configured');
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code,
                redirect_uri: config.callbackUrl,
            }),
            signal: AbortSignal.timeout(10000),
        });
        data = (await response.json()) as TokenResponse;
        if (
            !response.ok ||
            data.error ||
            typeof data.access_token !== 'string' ||
            !data.access_token
        )
            throw new Error('Could not obtain GitHub token');
    } catch {
        return res.redirect(
            `${frontendUrl}/${isLogin ? 'login' : 'services'}?error=github_flow_failed`,
        );
    }
    const accessToken = data.access_token;
    const tokenData = {
        accessToken: encryptString(accessToken),
        refreshToken: data.refresh_token ? encryptString(data.refresh_token) : null,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    };
    let userId = pendingLink.userId;
    let newUserData: Prisma.UserCreateInput | undefined;
    const userData = await getGitHubProfile(accessToken);
    const githubId = String(userData.id);
    if (isLogin) {
        let user = await prisma.user.findUnique({ where: { githubId } });
        if (!user) {
            const normalizedEmail = normalizeEmail(await getVerifiedGitHubEmail(accessToken));
            if (
                !normalizedEmail ||
                normalizedEmail.length > 254 ||
                !EMAIL_PATTERN.test(normalizedEmail)
            ) {
                return res
                    .status(400)
                    .json({ error: 'GitHub account must have a verified email address' });
            }
            user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (user?.githubId && user.githubId !== githubId)
                return res
                    .status(409)
                    .json({ error: 'This email belongs to a different GitHub identity.' });
            if (!user) {
                if (!pendingLink.registrationAccepted)
                    return res.redirect(
                        `${frontendUrl}/register?error=github_registration_requirements`,
                    );
                newUserData = {
                    email: normalizedEmail,
                    githubId,
                    displayName: userData.name || userData.login || null,
                    password: null,
                    cguAcceptedAt: new Date(),
                };
            }
        }
        userId = user?.id;
    }

    try {
        userId = await prisma.$transaction(async (tx) => {
            let accountId: number;
            if (newUserData) {
                const user = await tx.user.create({ data: newUserData });
                accountId = user.id;
            } else {
                if (userId === undefined) throw new Error('No account to link GitHub to');
                accountId = userId;
                await tx.user.update({ where: { id: accountId }, data: { githubId } });
            }
            await tx.oAuthToken.upsert({
                where: { userId_provider: { userId: accountId, provider: 'github' } },
                create: { userId: accountId, provider: 'github', ...tokenData },
                update: tokenData,
            });
            return accountId;
        });
    } catch {
        return res.redirect(
            `${frontendUrl}/${isLogin ? 'login' : 'services'}?error=github_flow_failed`,
        );
    }

    if (isLogin) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.redirect(`${frontendUrl}/login?error=github_flow_failed`);
        // The session cookie carries the JWT: no token ever appears in a URL.
        startSession(req, res, user);
        res.redirect(`${frontendUrl}/`);
    } else {
        res.redirect(`${frontendUrl}/services?linked=github`);
    }
});
